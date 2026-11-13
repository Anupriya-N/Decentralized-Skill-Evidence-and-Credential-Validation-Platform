import { prisma } from '../config/database.js';
import { BadRequestError, ForbiddenError } from '../utils/errors.js';
import {
  computeSha256,
  generateCertificateNumber,
  normalizeCredentialPayload,
  signCredentialPayload,
  buildMerkleTree,
} from '../utils/crypto.js';
import { decryptPrivateKey } from '../utils/encryption.js';
import { env } from '../config/env.js';
import { ethers } from 'ethers';
import { blockchainService } from '../services/blockchain.service.js';

export class InstitutionController {
  /**
   * Get institution dashboard stats
   */
  async getDashboard(req, res, next) {
    try {
      const issuerId = req.user.id;

      const [totalIssued, activeCredentials, revokedCredentials, pendingEvidence] =
        await Promise.all([
          prisma.credential.count({ where: { issuerId } }),
          prisma.credential.count({ where: { issuerId, status: 'ACTIVE' } }),
          prisma.credential.count({ where: { issuerId, status: 'REVOKED' } }),
          prisma.evidence.count({ where: { status: 'PENDING_REVIEW' } }),
        ]);

      res.status(200).json({
        success: true,
        data: {
          totalIssued,
          activeCredentials,
          revokedCredentials,
          pendingEvidence,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get credentials issued by this institution
   */
  async getIssuedCredentials(req, res, next) {
    try {
      const issuerId = req.user.id;
      const { status, search, page = 1, limit = 10 } = req.query;

      const where = { issuerId };
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { certificateNumber: { contains: search, mode: 'insensitive' } },
          { student: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const take = parseInt(limit, 10);
      const skip = (parseInt(page, 10) - 1) * take;

      const [total, credentials] = await Promise.all([
        prisma.credential.count({ where }),
        prisma.credential.findMany({
          where,
          include: {
            student: { select: { id: true, name: true, walletAddress: true } },
            skills: { include: { skill: true } },
            blockchainAnchor: true,
          },
          orderBy: { issuedAt: 'desc' },
          skip,
          take,
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          total,
          page: parseInt(page, 10),
          totalPages: Math.ceil(total / take),
          credentials,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Batch issue credentials to multiple students.
   * Priority 1: Uses decrypted institutional signing key (never BLOCKCHAIN_PRIVATE_KEY).
   * Generates genuine Merkle tree with individual sibling proofs for each credential.
   */
  async batchIssue(req, res, next) {
    try {
      const issuerId = req.user.id;
      const { items } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        throw new BadRequestError('Items array of credentials is required');
      }

      // Check institution accreditation
      const userRecord = await prisma.user.findUnique({
        where: { id: issuerId },
        include: { institutionProfile: true },
      });

      const isAccredited = req.user.role === 'ADMIN' || Boolean(userRecord?.institutionProfile?.isAccredited);
      if (!isAccredited) {
        throw new ForbiddenError('Only accredited institutions are authorized to issue credentials');
      }

      // Retrieve institutional signing key (priority: decrypted key at rest, never BLOCKCHAIN_PRIVATE_KEY)
      let institutionalKey = null;
      const encryptedKey = userRecord?.institutionProfile?.encryptedSigningKey;
      if (encryptedKey) {
        institutionalKey = decryptPrivateKey(encryptedKey);
      }

      if (!institutionalKey && process.env.INSTITUTION_SIGNING_KEY) {
        institutionalKey = process.env.INSTITUTION_SIGNING_KEY;
      }

      if (!institutionalKey || institutionalKey.length < 64) {
        throw new BadRequestError(
          'Institutional ECDSA private signing key is not configured or decrypted. Cannot generate genuine cryptographic signatures.'
        );
      }

      const cleanKey = institutionalKey.startsWith('0x') ? institutionalKey : `0x${institutionalKey}`;
      const signingWallet = new ethers.Wallet(cleanKey);
      const registeredIssuerAddress =
        userRecord?.walletAddress || userRecord?.institutionProfile?.signingPublicKey;

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
          where: { id: issuerId },
          data: {
            walletAddress: signingWallet.address,
            institutionProfile: {
              update: {
                signingPublicKey: signingWallet.address,
              },
            },
          },
        }).catch((err) => {
          console.warn('Could not auto-update institution wallet address in batch:', err.message);
        });
      }

      // Phase 1: Prepare normalized payloads and hashes with strict validation (No fake placeholder accounts)
      const preparedItems = [];
      const failures = [];

      for (const item of items) {
        let student = await prisma.user.findFirst({
          where: {
            OR: [
              { email: item.studentEmail?.toLowerCase() },
              { id: item.studentId },
            ],
          },
        });

        if (!student) {
          failures.push({
            studentEmail: item.studentEmail,
            studentId: item.studentId,
            title: item.title,
            reason: 'Student account not found on platform. Unregistered users cannot be issued credentials.',
          });
          continue;
        }

        if (student.role !== 'STUDENT') {
          failures.push({
            studentEmail: item.studentEmail,
            studentId: item.studentId,
            title: item.title,
            reason: 'Target recipient account is not a registered STUDENT.',
          });
          continue;
        }

        if (student.id === issuerId) {
          failures.push({
            studentEmail: item.studentEmail,
            studentId: item.studentId,
            title: item.title,
            reason: 'Institutions cannot issue credentials to themselves.',
          });
          continue;
        }

        if (item.evidenceId) {
          const evidence = await prisma.evidence.findUnique({
            where: { id: item.evidenceId },
          });
          if (!evidence) {
            failures.push({
              studentEmail: item.studentEmail,
              title: item.title,
              reason: 'Referenced evidence artifact not found.',
            });
            continue;
          }
          if (evidence.studentId !== student.id) {
            failures.push({
              studentEmail: item.studentEmail,
              title: item.title,
              reason: 'Referenced evidence artifact does not belong to the student recipient.',
            });
            continue;
          }
          if (evidence.status !== 'APPROVED') {
            failures.push({
              studentEmail: item.studentEmail,
              title: item.title,
              reason: 'Referenced evidence must be officially approved before credential issuance.',
            });
            continue;
          }
        }

        const certNum = generateCertificateNumber('INST', item.courseCode || 'GEN');
        const issuedDate = new Date();

        const normalizedPayload = normalizeCredentialPayload({
          certificateNumber: certNum,
          studentId: student.id,
          issuerId,
          title: item.title,
          type: item.type || 'CERTIFICATE',
          badgeLevel: item.badgeLevel || 'BRONZE',
          grade: item.grade || 'Pass',
          courseCode: item.courseCode,
          issuedAt: issuedDate,
        });

        const credHash = computeSha256(normalizedPayload);
        const { signature } = await signCredentialPayload(normalizedPayload, cleanKey);

        preparedItems.push({
          item,
          student,
          certNum,
          issuedDate,
          normalizedPayload,
          credHash,
          signature,
        });
      }

      if (preparedItems.length === 0) {
        throw new BadRequestError('No valid student recipients found in batch. Unregistered or invalid entries were rejected.');
      }

      // Phase 2: Compute Merkle Tree for batch
      const leafHashes = preparedItems.map((p) => p.credHash);
      const merkleTree = buildMerkleTree(leafHashes);

      // Phase 3: Submit each credential via EIP-712 relayed anchoring and persist with genuine proofs
      const created = [];
      let startingNonce = null;
      try {
        startingNonce = await blockchainService.getNonce(signingWallet.address);
      } catch (nonceErr) {
        console.warn('Batch issue: could not fetch live nonce, will mark blockchain status as PENDING:', nonceErr.message);
      }

      for (let i = 0; i < preparedItems.length; i++) {
        const p = preparedItems[i];
        const proof = merkleTree.proofs[p.credHash] || [];

        let anchorResult = {
          isConfirmed: false,
          status: 'PENDING_BLOCKCHAIN',
          transactionHash: null,
          blockNumber: null,
          contractAddress: env.CONTRACT_ADDRESS || null,
          network: 'Ethereum Sepolia',
        };

        if (startingNonce !== null) {
          try {
            // Retrieve actual on-chain nonce dynamically to handle failed transactions or consumed nonces safely
            let itemNonce;
            try {
              itemNonce = await blockchainService.getNonce(signingWallet.address);
            } catch (_) {
              itemNonce = startingNonce + i;
            }

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

            const formattedHash = p.credHash.startsWith('0x') ? p.credHash : `0x${p.credHash}`;
            const value = {
              credentialHash: formattedHash,
              issuer: signingWallet.address,
              nonce: itemNonce,
              deadline: deadline,
            };

            const eip712Signature = await signingWallet.signTypedData(domain, types, value);

            anchorResult = await blockchainService.anchorCredentialWithSignature(
              formattedHash,
              signingWallet.address,
              itemNonce,
              deadline,
              eip712Signature
            );
          } catch (itemBcErr) {
            anchorResult = {
              isConfirmed: false,
              status: 'PENDING_BLOCKCHAIN',
              reason: itemBcErr.message,
              transactionHash: null,
              blockNumber: null,
              contractAddress: env.CONTRACT_ADDRESS || null,
              network: 'Ethereum Sepolia',
            };
          }
        }

        const cred = await prisma.credential.create({
          data: {
            certificateNumber: p.certNum,
            studentId: p.student.id,
            issuerId,
            title: p.item.title,
            description: p.item.description,
            type: p.item.type || 'CERTIFICATE',
            badgeLevel: p.item.badgeLevel || 'BRONZE',
            grade: p.item.grade || 'Pass',
            courseCode: p.item.courseCode,
            issuedAt: p.issuedDate,
            credentialHash: p.credHash,
            digitalSignature: p.signature,
            merkleRoot: merkleTree.root,
            qrCodeUrl: `${env.FRONTEND_URL}/verify/${p.certNum}`,
            onChainRevocationStatus: 'NOT_REVOKED',
            blockchainAnchor: {
              create: {
                network: anchorResult.network || 'Ethereum Sepolia',
                contractAddress: anchorResult.contractAddress,
                transactionHash: anchorResult.transactionHash,
                blockNumber: anchorResult.blockNumber,
                merkleRoot: merkleTree.root,
                merkleProof: proof,
                isConfirmed: anchorResult.isConfirmed,
                status: anchorResult.status,
              },
            },
          },
          include: {
            blockchainAnchor: true,
          },
        });

        created.push(cred);
      }

      res.status(201).json({
        success: true,
        message: `Successfully issued ${created.length} credentials with Merkle batch root ${merkleTree.root}${failures.length > 0 ? ` (${failures.length} items skipped/rejected)` : ''}`,
        data: {
          count: created.length,
          failedCount: failures.length,
          batchMerkleRoot: merkleTree.root,
          credentials: created,
          failures,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending evidence submissions for this institution
   */
  async getPendingEvidence(req, res, next) {
    try {
      const evidence = await prisma.evidence.findMany({
        where: { status: 'PENDING_REVIEW' },
        include: {
          student: { select: { id: true, name: true } },
          skills: { include: { skill: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: evidence,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const institutionController = new InstitutionController();
