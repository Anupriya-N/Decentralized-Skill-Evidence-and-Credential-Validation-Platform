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

      // Phase 1: Prepare normalized payloads and hashes
      const preparedItems = [];
      for (const item of items) {
        let student = await prisma.user.findFirst({
          where: {
            OR: [
              { email: item.studentEmail?.toLowerCase() },
              { id: item.studentId },
            ],
          },
        });

        if (!student && item.studentEmail) {
          student = await prisma.user.create({
            data: {
              email: item.studentEmail.toLowerCase(),
              name: item.studentName || item.studentEmail.split('@')[0],
              passwordHash: 'placeholder-needs-reset',
              role: 'STUDENT',
              studentProfile: {
                create: {
                  portfolioSlug: item.studentEmail.split('@')[0] + '-' + Math.floor(100 + Math.random() * 900),
                },
              },
            },
          });
        }

        if (!student || student.role !== 'STUDENT' || student.id === issuerId) {
          continue; // Skip non-students or self-issuance
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
        throw new BadRequestError('No valid student recipients found in batch');
      }

      // Phase 2: Compute Merkle Tree for batch
      const leafHashes = preparedItems.map((p) => p.credHash);
      const merkleTree = buildMerkleTree(leafHashes);

      // Phase 3: Persist credentials with genuine proofs
      const created = [];
      for (const p of preparedItems) {
        const proof = merkleTree.proofs[p.credHash] || [];

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
                network: 'Ethereum Sepolia',
                contractAddress: null,
                transactionHash: null,
                blockNumber: null,
                merkleRoot: merkleTree.root,
                merkleProof: proof,
                isConfirmed: false,
                status: 'PENDING_BLOCKCHAIN',
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
        message: `Successfully issued ${created.length} credentials with Merkle batch root ${merkleTree.root}`,
        data: {
          count: created.length,
          batchMerkleRoot: merkleTree.root,
          credentials: created,
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
