import { prisma } from '../config/database.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import {
  computeSha256,
  generateCertificateNumber,
  normalizeCredentialPayload,
  signCredentialPayload,
  computeMerkleRoot,
} from '../utils/crypto.js';
import { decryptPrivateKey } from '../utils/encryption.js';
import { generateQrDataUrl, generateQrSvg } from '../utils/qr.js';
import { blockchainService } from '../services/blockchain.service.js';
import { env } from '../config/env.js';
import { ethers } from 'ethers';

export class CredentialController {
  /**
   * Issue a new credential.
   * Priority 1: Uses decrypted institutional signing key (never BLOCKCHAIN_PRIVATE_KEY).
   * Validates target is STUDENT.
   */
  async issue(req, res, next) {
    try {
      const issuerId = req.user.id;
      const {
        studentId,
        studentEmail,
        evidenceId,
        title,
        description,
        type = 'CERTIFICATE',
        badgeLevel = 'BRONZE',
        grade,
        courseCode,
        skills = [],
        expiresAt,
      } = req.body;

      if (!title) {
        throw new BadRequestError('Credential title is required');
      }

      // 1. Authorization: Only approved institutions may issue
      const isAccredited = req.user.role === 'ADMIN' || Boolean(req.user.rawUser?.institutionProfile?.isAccredited);
      if (!isAccredited) {
        throw new ForbiddenError('Only accredited institutions are authorized to issue credentials');
      }

      // 2. Enforce: Only STUDENT accounts may receive student credentials
      let student = await prisma.user.findFirst({
        where: {
          OR: [
            { id: studentId },
            { email: studentEmail?.toLowerCase() },
          ],
        },
      });

      if (!student) {
        throw new NotFoundError('Target student record not found for credential assignment');
      }

      if (student.role !== 'STUDENT') {
        throw new BadRequestError('Credentials can only be assigned to accounts with the STUDENT role');
      }

      // Validate referenced evidence artifact if provided (Institutional Review & Approval Enforcement)
      let referencedEvidence = null;
      if (evidenceId) {
        referencedEvidence = await prisma.evidence.findUnique({
          where: { id: evidenceId },
        });

        if (!referencedEvidence) {
          throw new NotFoundError('Referenced evidence artifact not found');
        }

        if (referencedEvidence.studentId !== student.id) {
          throw new BadRequestError('Referenced evidence artifact does not belong to the target student');
        }

        if (referencedEvidence.status !== 'APPROVED') {
          throw new BadRequestError('Evidence must be officially approved by an authorized institution before issuing credentials');
        }
      }

      // 3. Security: Issuers cannot issue credentials to themselves
      if (student.id === issuerId) {
        throw new ForbiddenError('Issuing institutions cannot issue student credentials to themselves');
      }

      // 4. Retrieve institutional private signing key (Priority 1: Dedicated institutional key, never BLOCKCHAIN_PRIVATE_KEY)
      let institutionalKey = null;
      const encryptedKey = req.user.rawUser?.institutionProfile?.encryptedSigningKey;
      if (encryptedKey) {
        institutionalKey = decryptPrivateKey(encryptedKey);
      }

      if (!institutionalKey && process.env.INSTITUTION_SIGNING_KEY) {
        institutionalKey = process.env.INSTITUTION_SIGNING_KEY;
      }

      if (!institutionalKey || institutionalKey.length < 64) {
        throw new BadRequestError(
          'Institutional private signing key is not configured or could not be decrypted. Institution must provision a secure signing key before issuing credentials.'
        );
      }

      // Verify signing key matches registered institution public identity
      const cleanKey = institutionalKey.startsWith('0x') ? institutionalKey : `0x${institutionalKey}`;
      const signingWallet = new ethers.Wallet(cleanKey);
      const registeredIssuerAddress =
        req.user.rawUser?.walletAddress || req.user.rawUser?.institutionProfile?.signingPublicKey;

      if (
        registeredIssuerAddress &&
        ethers.isAddress(registeredIssuerAddress) &&
        signingWallet.address.toLowerCase() !== registeredIssuerAddress.toLowerCase()
      ) {
        throw new BadRequestError(
          `Signing key address (${signingWallet.address}) does not match the institution's registered public identity (${registeredIssuerAddress})`
        );
      }

      if (!registeredIssuerAddress) {
        await prisma.user.update({
          where: { id: req.user.id },
          data: {
            walletAddress: signingWallet.address,
            institutionProfile: {
              update: {
                signingPublicKey: signingWallet.address,
              },
            },
          },
        }).catch((err) => {
          console.warn('Could not auto-update institution wallet address:', err.message);
        });
      }

      const certNumber = generateCertificateNumber('CRT', courseCode || 'SKILL');
      const issuedAtDate = new Date();

      // 5. Deterministic payload normalization
      const normalizedPayload = normalizeCredentialPayload({
        certificateNumber: certNumber,
        studentId: student.id,
        issuerId,
        title,
        type,
        badgeLevel,
        grade,
        courseCode,
        issuedAt: issuedAtDate,
      });

      // 6. Independent hash computation
      const credentialHash = computeSha256(normalizedPayload);

      // 7. Genuine Ethereum ECDSA digital signature using institutional key
      const { signature } = await signCredentialPayload(normalizedPayload, cleanKey);
      const merkleRoot = computeMerkleRoot([credentialHash]);

      // 8. Genuine Blockchain Anchor Submission via institutional EIP-712 authorization
      let anchorResult = {
        isConfirmed: false,
        status: 'PENDING_BLOCKCHAIN',
        transactionHash: null,
        blockNumber: null,
        contractAddress: env.CONTRACT_ADDRESS || null,
        network: 'Ethereum Sepolia',
      };

      try {
        const nonce = await blockchainService.getNonce(signingWallet.address);
        const deadline = Math.floor(Date.now() / 1000) + 3600;

        const domain = {
          name: 'CertiTrustAnchor',
          version: '1',
          chainId: env.CHAIN_ID,
          verifyingContract: env.CONTRACT_ADDRESS,
        };

        const types = {
          IssueAuthorization: [
            { name: 'credentialHash', type: 'bytes32' },
            { name: 'issuer', type: 'address' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
          ],
        };

        const formattedHash = credentialHash.startsWith('0x') ? credentialHash : `0x${credentialHash}`;
        const value = {
          credentialHash: formattedHash,
          issuer: signingWallet.address,
          nonce: nonce,
          deadline: deadline,
        };

        const eip712Signature = await signingWallet.signTypedData(domain, types, value);

        anchorResult = await blockchainService.anchorCredentialWithSignature(
          formattedHash,
          signingWallet.address,
          nonce,
          deadline,
          eip712Signature
        );
      } catch (bcError) {
        anchorResult = {
          isConfirmed: false,
          status: 'PENDING_BLOCKCHAIN',
          reason: bcError.message,
          transactionHash: null,
          blockNumber: null,
          contractAddress: env.CONTRACT_ADDRESS || null,
          network: 'Ethereum Sepolia',
        };
      }

      // 9. Store in PostgreSQL
      const credential = await prisma.credential.create({
        data: {
          certificateNumber: certNumber,
          studentId: student.id,
          issuerId,
          title,
          description,
          type,
          badgeLevel,
          grade,
          courseCode,
          issuedAt: issuedAtDate,
          credentialHash,
          merkleRoot,
          digitalSignature: signature,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          qrCodeUrl: `${env.FRONTEND_URL}/verify/${certNumber}`,
          onChainRevocationStatus: 'NOT_REVOKED',
          metadata: referencedEvidence
            ? {
                evidenceId: referencedEvidence.id,
                evidenceTitle: referencedEvidence.title,
                evidenceHash: referencedEvidence.sha256Hash,
                evidenceType: referencedEvidence.evidenceType,
              }
            : undefined,
          blockchainAnchor: {
            create: {
              network: anchorResult.network || 'Ethereum Sepolia',
              contractAddress: anchorResult.contractAddress,
              transactionHash: anchorResult.transactionHash,
              blockNumber: anchorResult.blockNumber,
              merkleRoot,
              merkleProof: [],
              isConfirmed: anchorResult.isConfirmed,
              status: anchorResult.status,
            },
          },
        },
        include: {
          student: { select: { id: true, name: true, walletAddress: true } },
          issuer: {
            select: {
              id: true,
              name: true,
              walletAddress: true,
              institutionProfile: {
                select: {
                  institutionName: true,
                  isAccredited: true,
                  signingPublicKey: true,
                  officialDomain: true,
                },
              },
            },
          },
          blockchainAnchor: true,
        },
      });

      // Link skills
      if (Array.isArray(skills) && skills.length > 0) {
        for (const skillItem of skills) {
          const skillName = typeof skillItem === 'string' ? skillItem : skillItem.name;
          let skill = await prisma.skill.findFirst({
            where: { name: { equals: skillName, mode: 'insensitive' } },
          });

          if (!skill) {
            skill = await prisma.skill.create({
              data: {
                name: skillName,
                code: skillName.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 30),
                category: 'OTHER',
              },
            });
          }

          await prisma.credentialSkill.create({
            data: {
              credentialId: credential.id,
              skillId: skill.id,
              weight: 1.0,
            },
          });
        }
      }

      // Audit Log
      await prisma.auditLog.create({
        data: {
          userId: issuerId,
          action: 'CREDENTIAL_ISSUED',
          entity: 'CREDENTIAL',
          entityId: credential.id,
          details: {
            certificateNumber: certNumber,
            studentId: student.id,
            blockchainConfirmed: anchorResult.isConfirmed,
          },
        },
      });

      // Student Notification
      await prisma.notification.create({
        data: {
          userId: student.id,
          type: 'CREDENTIAL_RECEIVED',
          title: 'New Credential Issued',
          message: `You have received a new verified credential: "${title}"`,
          actionUrl: `/student/credentials/${credential.id}`,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Credential successfully issued and cryptographically signed',
        data: credential,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke a credential (Priority 5: Tracks database and on-chain revocation separately)
   */
  async revoke(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const credential = await prisma.credential.findFirst({
        where: { OR: [{ id }, { certificateNumber: id }] },
      });

      if (!credential) {
        throw new NotFoundError('Credential not found');
      }

      if (credential.status === 'REVOKED') {
        throw new BadRequestError('Credential is already revoked in the system');
      }

      // Only authorized issuer or admin can revoke
      if (req.user.role !== 'ADMIN' && credential.issuerId !== req.user.id) {
        throw new ForbiddenError('Only the issuing institution or an administrator can revoke this credential');
      }

      // Attempt on-chain revocation using institutional EIP-712 authorization if available
      let onChainRevocationStatus = 'REVOKE_PENDING';
      let onChainRevocationTx = null;

      if (credential.credentialHash) {
        try {
          let institutionalKey = null;
          const encryptedKey = req.user.rawUser?.institutionProfile?.encryptedSigningKey;
          if (encryptedKey) {
            institutionalKey = decryptPrivateKey(encryptedKey);
          }
          if (!institutionalKey && process.env.INSTITUTION_SIGNING_KEY) {
            institutionalKey = process.env.INSTITUTION_SIGNING_KEY;
          }

          if (institutionalKey && institutionalKey.length >= 64) {
            const cleanKey = institutionalKey.startsWith('0x') ? institutionalKey : `0x${institutionalKey}`;
            const signingWallet = new ethers.Wallet(cleanKey);
            const nonce = await blockchainService.getNonce(signingWallet.address);
            const deadline = Math.floor(Date.now() / 1000) + 3600;

            const domain = {
              name: 'CertiTrustAnchor',
              version: '1',
              chainId: env.CHAIN_ID,
              verifyingContract: env.CONTRACT_ADDRESS,
            };

            const types = {
              RevokeAuthorization: [
                { name: 'credentialHash', type: 'bytes32' },
                { name: 'issuer', type: 'address' },
                { name: 'nonce', type: 'uint256' },
                { name: 'deadline', type: 'uint256' },
              ],
            };

            const formattedHash = credential.credentialHash.startsWith('0x')
              ? credential.credentialHash
              : `0x${credential.credentialHash}`;

            const value = {
              credentialHash: formattedHash,
              issuer: signingWallet.address,
              nonce: nonce,
              deadline: deadline,
            };

            const signature = await signingWallet.signTypedData(domain, types, value);

            const onChainResult = await blockchainService.revokeOnChainWithSignature(
              formattedHash,
              signingWallet.address,
              nonce,
              deadline,
              signature
            );

            if (onChainResult.success) {
              onChainRevocationStatus = 'REVOKE_CONFIRMED';
              onChainRevocationTx = onChainResult.transactionHash;
            }
          } else {
            // Admin fallback direct revocation (contract owner)
            const onChainResult = await blockchainService.revokeOnChain(credential.credentialHash);
            if (onChainResult.success) {
              onChainRevocationStatus = 'REVOKE_CONFIRMED';
              onChainRevocationTx = onChainResult.transactionHash;
            }
          }
        } catch {
          onChainRevocationStatus = 'REVOKE_PENDING';
        }
      }

      const updated = await prisma.credential.update({
        where: { id: credential.id },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revocationReason: reason || 'Revoked by authorized institution',
          onChainRevocationStatus,
          onChainRevocationTx,
        },
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'CREDENTIAL_REVOKED',
          entity: 'CREDENTIAL',
          entityId: credential.id,
          details: { reason, onChainRevocationStatus },
        },
      });

      // Student Notification
      await prisma.notification.create({
        data: {
          userId: credential.studentId,
          type: 'CREDENTIAL_REVOKED',
          title: 'Credential Revoked',
          message: `Your credential "${credential.title}" was revoked: ${reason || 'Administrative update'}`,
          actionUrl: `/student/credentials/${credential.id}`,
        },
      });

      res.status(200).json({
        success: true,
        message: `Credential revoked locally (${onChainRevocationStatus === 'REVOKE_CONFIRMED' ? 'blockchain confirmed' : 'blockchain reconciliation pending'})`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reconcile pending on-chain revocation (Priority 5)
   */
  async reconcileRevocation(req, res, next) {
    try {
      const { id } = req.params;

      const credential = await prisma.credential.findFirst({
        where: { OR: [{ id }, { certificateNumber: id }] },
      });

      if (!credential || credential.status !== 'REVOKED') {
        throw new BadRequestError('Credential must be locally revoked before reconciling on-chain');
      }

      if (credential.onChainRevocationStatus === 'REVOKE_CONFIRMED') {
        return res.status(200).json({
          success: true,
          message: 'On-chain revocation is already confirmed',
          data: credential,
        });
      }

      // Live on-chain readback check before transaction submission
      const onChainStatus = await blockchainService.verifyOnChain(credential.credentialHash);
      if (onChainStatus.checked && onChainStatus.revoked) {
        const updated = await prisma.credential.update({
          where: { id: credential.id },
          data: {
            onChainRevocationStatus: 'REVOKE_CONFIRMED',
          },
        });
        return res.status(200).json({
          success: true,
          message: 'On-chain revocation confirmed via live blockchain verification',
          data: updated,
        });
      }

      // Obtain institutional key or relayer ownership
      let onChainResult = null;
      let institutionalKey = null;
      const encryptedKey = req.user.rawUser?.institutionProfile?.encryptedSigningKey;
      if (encryptedKey) {
        institutionalKey = decryptPrivateKey(encryptedKey);
      }
      if (!institutionalKey && process.env.INSTITUTION_SIGNING_KEY) {
        institutionalKey = process.env.INSTITUTION_SIGNING_KEY;
      }

      try {
        if (institutionalKey && institutionalKey.length >= 64) {
          const cleanKey = institutionalKey.startsWith('0x') ? institutionalKey : `0x${institutionalKey}`;
          const signingWallet = new ethers.Wallet(cleanKey);
          const nonce = await blockchainService.getNonce(signingWallet.address);
          const deadline = Math.floor(Date.now() / 1000) + 3600;

          const domain = {
            name: 'CertiTrustAnchor',
            version: '1',
            chainId: env.CHAIN_ID,
            verifyingContract: env.CONTRACT_ADDRESS,
          };

          const types = {
            RevokeAuthorization: [
              { name: 'credentialHash', type: 'bytes32' },
              { name: 'issuer', type: 'address' },
              { name: 'nonce', type: 'uint256' },
              { name: 'deadline', type: 'uint256' },
            ],
          };

          const formattedHash = credential.credentialHash.startsWith('0x')
            ? credential.credentialHash
            : `0x${credential.credentialHash}`;

          const value = {
            credentialHash: formattedHash,
            issuer: signingWallet.address,
            nonce: nonce,
            deadline: deadline,
          };

          const signature = await signingWallet.signTypedData(domain, types, value);

          onChainResult = await blockchainService.revokeOnChainWithSignature(
            formattedHash,
            signingWallet.address,
            nonce,
            deadline,
            signature
          );
        } else if (req.user.role === 'ADMIN') {
          // Admin fallback direct revocation (verifies owner on-chain)
          onChainResult = await blockchainService.revokeOnChain(credential.credentialHash);
        } else {
          throw new BadRequestError('Institutional signing key required to authorize on-chain revocation relay');
        }
      } catch (err) {
        return res.status(503).json({
          success: false,
          error: `Blockchain node error during reconciliation: ${err.message}`,
          status: 'REVOKE_PENDING',
        });
      }

      if (!onChainResult.success) {
        return res.status(503).json({
          success: false,
          message: `On-chain revocation retry failed: ${onChainResult.reason || onChainResult.error}`,
          status: 'REVOKE_PENDING',
        });
      }

      const updated = await prisma.credential.update({
        where: { id: credential.id },
        data: {
          onChainRevocationStatus: 'REVOKE_CONFIRMED',
          onChainRevocationTx: onChainResult.transactionHash,
        },
      });

      res.status(200).json({
        success: true,
        message: 'On-chain revocation reconciled and confirmed',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get student credentials (Private to student)
   */
  async getMyCredentials(req, res, next) {
    try {
      const studentId = req.user.id;

      const credentials = await prisma.credential.findMany({
        where: { studentId },
        include: {
          issuer: {
            select: {
              id: true,
              name: true,
              institutionProfile: { select: { institutionName: true, isAccredited: true } },
            },
          },
          skills: { include: { skill: true } },
          blockchainAnchor: true,
        },
        orderBy: { issuedAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: credentials,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get credential by ID or Certificate Number (Sanitized: Never exposes private keys or emails)
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;

      const credential = await prisma.credential.findFirst({
        where: {
          OR: [
            { id },
            { certificateNumber: id },
            { credentialHash: id },
          ],
        },
        include: {
          student: { select: { id: true, name: true, walletAddress: true } },
          issuer: {
            select: {
              id: true,
              name: true,
              walletAddress: true,
              institutionProfile: { select: { institutionName: true, isAccredited: true, signingPublicKey: true } },
            },
          },
          skills: { include: { skill: true } },
          blockchainAnchor: true,
        },
      });

      if (!credential) {
        throw new NotFoundError('Credential not found');
      }

      res.status(200).json({
        success: true,
        data: credential,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate QR Code representation
   */
  async getQrCode(req, res, next) {
    try {
      const { id } = req.params;

      const credential = await prisma.credential.findFirst({
        where: {
          OR: [{ id }, { certificateNumber: id }],
        },
      });

      if (!credential) {
        throw new NotFoundError('Credential not found');
      }

      const verifyUrl = `${env.FRONTEND_URL}/verify/${credential.certificateNumber}`;
      const format = req.query.format || 'dataUrl';

      if (format === 'svg') {
        const svg = await generateQrSvg(verifyUrl);
        res.setHeader('Content-Type', 'image/svg+xml');
        return res.send(svg);
      }

      const dataUrl = await generateQrDataUrl(verifyUrl);
      res.status(200).json({
        success: true,
        data: {
          dataUrl,
          verifyUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update credential non-cryptographic metadata (description, visibility)
   * Strictly preserves original cryptographic credentialHash and Merkle root.
   */
  async updateMetadata(req, res, next) {
    try {
      const { id } = req.params;
      const { description, visibility, title } = req.body;

      const credential = await prisma.credential.findFirst({
        where: {
          OR: [{ id }, { certificateNumber: id }],
        },
      });

      if (!credential) {
        throw new NotFoundError('Credential not found');
      }

      // Authorization: Recipient student, issuing institution, or admin
      const isOwner = credential.studentId === req.user.id;
      const isIssuer = credential.issuerId === req.user.id;
      const isAdmin = req.user.role === 'ADMIN';

      if (!isOwner && !isIssuer && !isAdmin) {
        throw new ForbiddenError('Unauthorized to update this credential metadata');
      }

      const updateData = {};
      if (description !== undefined) updateData.description = description;
      if (title !== undefined && (isIssuer || isAdmin)) updateData.title = title;
      if (visibility !== undefined) {
        const currentMeta = typeof credential.metadata === 'object' && credential.metadata !== null
          ? credential.metadata
          : {};
        updateData.metadata = { ...currentMeta, visibility };
      }

      const updated = await prisma.credential.update({
        where: { id: credential.id },
        data: updateData,
        include: {
          student: { select: { id: true, name: true, walletAddress: true } },
          issuer: {
            select: {
              id: true,
              name: true,
              walletAddress: true,
              institutionProfile: { select: { institutionName: true, isAccredited: true } },
            },
          },
          blockchainAnchor: true,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Credential metadata updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const credentialController = new CredentialController();
