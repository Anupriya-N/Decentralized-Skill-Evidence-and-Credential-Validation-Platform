import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ethers } from 'ethers';
import {
  normalizeCredentialPayload,
  computeSha256,
  signCredentialPayload,
} from '../src/utils/crypto.js';
import { encryptPrivateKey } from '../src/utils/encryption.js';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('CRITICAL: Seed script execution blocked in production environment.');
    process.exit(1);
  }

  console.log('--- Starting Safe Development Seeding for CertiTrust (Backend_04 Standards) ---');

  const standardPasswordHash = await bcrypt.hash('Password123!', 10);
  const adminPasswordHash = await bcrypt.hash(process.env.DEV_ADMIN_PASSWORD || 'DevAdminPass2026!', 10);

  // Generate or load development wallet for Oxford demo institution
  // In development, uses environment key if present or generates an ephemeral keypair
  const demoOxfordWallet = process.env.DEMO_INSTITUTION_PRIVATE_KEY
    ? new ethers.Wallet(process.env.DEMO_INSTITUTION_PRIVATE_KEY)
    : ethers.Wallet.createRandom();

  const encryptedOxfordKey = encryptPrivateKey(demoOxfordWallet.privateKey);

  // 1. Seed or Upsert Standardized Skills
  console.log('Seeding Standardized Skills...');
  const skillsData = [
    { code: 'SOLIDITY_CORE', name: 'Solidity', category: 'BLOCKCHAIN', description: 'Ethereum smart contract programming and gas optimization.' },
    { code: 'SMART_CONTRACTS', name: 'Smart Contract Development', category: 'BLOCKCHAIN', description: 'Architecture, testing, and deployment of EVM contracts.' },
    { code: 'REACT_DEV', name: 'React.js', category: 'FRONTEND', description: 'Modern reactive component architecture, hooks, and state management.' },
    { code: 'NODE_EXPRESS', name: 'Node.js & Express', category: 'BACKEND', description: 'Server-side RESTful API engineering with robust routing and middleware.' },
    { code: 'POSTGRES_SQL', name: 'PostgreSQL', category: 'DATABASE', description: 'Relational data modeling, ACID transactions, and indexing.' },
    { code: 'WEB3_INTEGRATION', name: 'Web3.js & Ethers.js', category: 'BLOCKCHAIN', description: 'Client-side wallet connectivity and contract interactions.' },
    { code: 'SECURITY_AUDIT', name: 'Smart Contract Security', category: 'SECURITY', description: 'Static analysis, vulnerability remediation (reentrancy, integer flows).' },
    { code: 'TYPESCRIPT', name: 'TypeScript', category: 'BACKEND', description: 'Strong static typing, interface contracts, and modern TS design patterns.' },
    { code: 'DOCKER', name: 'Docker & Containers', category: 'CLOUD', description: 'Containerization, reproducible deployment environments.' },
    { code: 'ZK_PROOFS', name: 'Zero-Knowledge Proofs', category: 'SECURITY', description: 'zk-SNARKs and cryptographic privacy-preserving computation.' },
  ];

  for (const s of skillsData) {
    await prisma.skill.upsert({
      where: { code: s.code },
      update: { name: s.name, category: s.category, description: s.description },
      create: s,
    });
  }

  // 2. Seed Users safely with Upsert (Preserving existing approval statuses and roles)
  console.log('Seeding Demo Development Users...');
  const alexUser = await prisma.user.upsert({
    where: { email: 'alex.chen@student.edu' },
    update: {}, // Safe upsert: never overwrite existing user data or roles
    create: {
      email: 'alex.chen@student.edu',
      passwordHash: standardPasswordHash,
      name: 'Alex Chen',
      role: 'STUDENT',
      isVerified: true,
      walletAddress: '0x71C836489370C92257982E259d74944bC41d40aE',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      profile: {
        create: {
          headline: 'Full-Stack & Blockchain Developer',
          bio: 'Passionate about decentralized systems, smart contract security, and transparent credential verification.',
          location: 'Oxford, United Kingdom',
          website: 'https://alexchen.dev',
          socialLinks: { github: 'alexchen', linkedin: 'alexchen-dev' },
        },
      },
      studentProfile: {
        create: {
          studentNumber: 'OX-2023-CS-892',
          degreeProgram: 'M.Sc. in Distributed Systems and Cryptography',
          graduationYear: 2026,
          gpa: 3.88,
          githubUsername: 'alexchen',
          linkedinProfile: 'https://linkedin.com/in/alexchen-dev',
          portfolioSlug: 'alex-chen',
          isPortfolioPublic: true,
        },
      },
    },
    include: { studentProfile: true },
  });

  const oxfordUser = await prisma.user.upsert({
    where: { email: 'oxford@institution.edu' },
    update: {}, // Safe upsert: preserve existing accreditation and profile
    create: {
      email: 'oxford@institution.edu',
      passwordHash: standardPasswordHash,
      name: 'Oxford University',
      role: 'INSTITUTION',
      isVerified: true,
      walletAddress: demoOxfordWallet.address,
      avatarUrl: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=150',
      institutionProfile: {
        create: {
          institutionName: 'Oxford University',
          accreditationBody: 'UK Higher Education Standards Agency',
          accreditationNumber: 'UK-HESA-98210',
          isAccredited: true,
          officialDomain: 'ox.ac.uk',
          encryptedSigningKey: encryptedOxfordKey,
          signingPublicKey: demoOxfordWallet.address,
          contactEmail: 'registry@ox.ac.uk',
          country: 'GB',
        },
      },
    },
  });

  await prisma.user.upsert({
    where: { email: 'recruiter@techcorp.com' },
    update: {}, // Safe upsert: preserve existing employer verification
    create: {
      email: 'recruiter@techcorp.com',
      passwordHash: standardPasswordHash,
      name: 'Sarah Jenkins',
      role: 'EMPLOYER',
      isVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      employerProfile: {
        create: {
          companyName: 'TechCorp Web3 Solutions',
          industry: 'Fintech & Blockchain',
          companySize: '250-500 employees',
          website: 'https://techcorp-web3.io',
          isVerifiedCompany: true,
        },
      },
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@certitrust.io' },
    update: {}, // Safe upsert: never overwrite existing admin
    create: {
      email: 'admin@certitrust.io',
      passwordHash: adminPasswordHash,
      name: 'System Administrator',
      role: 'ADMIN',
      isVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    },
  });

  // 3. Demo Active Credential with Genuine Cryptographic ECDSA Signature
  console.log('Seeding Demo Credential with Genuine ECDSA Signature...');
  const certNumber = 'OXF-2025-CS-00491';
  const issuedDate = new Date('2025-06-20T10:00:00Z');

  const normalizedPayload = normalizeCredentialPayload({
    certificateNumber: certNumber,
    studentId: alexUser.id,
    issuerId: oxfordUser.id,
    title: 'Master of Science in Distributed Computing & Blockchain',
    type: 'DEGREE',
    badgeLevel: 'GOLD',
    grade: 'Distinction (First Class)',
    courseCode: 'CS-892',
    issuedAt: issuedDate,
  });

  const credentialHash = computeSha256(normalizedPayload);
  const { signature } = await signCredentialPayload(normalizedPayload, demoOxfordWallet.privateKey);

  await prisma.credential.upsert({
    where: { certificateNumber: certNumber },
    update: {}, // Safe upsert: preserve credential status
    create: {
      certificateNumber: certNumber,
      studentId: alexUser.id,
      issuerId: oxfordUser.id,
      title: 'Master of Science in Distributed Computing & Blockchain',
      description: 'Awarded for advanced research in distributed consensus, fault tolerance, and EVM architecture.',
      type: 'DEGREE',
      status: 'ACTIVE',
      badgeLevel: 'GOLD',
      grade: 'Distinction (First Class)',
      courseCode: 'CS-892',
      issuedAt: issuedDate,
      credentialHash,
      merkleRoot: credentialHash,
      digitalSignature: signature,
      qrCodeUrl: `/api/v1/credentials/qr/${certNumber}`,
      onChainRevocationStatus: 'NOT_REVOKED',
      blockchainAnchor: {
        create: {
          network: 'Ethereum Sepolia',
          contractAddress: null, // Nullable pending deployment
          transactionHash: null, // Nullable pending deployment - NO fake hashes
          blockNumber: null,
          merkleRoot: credentialHash,
          merkleProof: [], // Single-leaf direct anchor has empty sibling proof array
          isConfirmed: false,
          status: 'PENDING_BLOCKCHAIN',
        },
      },
    },
  });

  // 4. Demo Revoked Credential
  const revokedCertNum = 'OXF-2024-LEGACY-0012';
  const revokedIssuedDate = new Date('2024-03-10T10:00:00Z');

  const revokedPayload = normalizeCredentialPayload({
    certificateNumber: revokedCertNum,
    studentId: alexUser.id,
    issuerId: oxfordUser.id,
    title: 'Introductory Blockchain Technologies (Legacy)',
    type: 'COURSE_COMPLETION',
    badgeLevel: 'BRONZE',
    grade: null,
    courseCode: null,
    issuedAt: revokedIssuedDate,
  });

  const revokedHash = computeSha256(revokedPayload);
  const revokedSigRes = await signCredentialPayload(revokedPayload, demoOxfordWallet.privateKey);

  await prisma.credential.upsert({
    where: { certificateNumber: revokedCertNum },
    update: {}, // Safe upsert: preserve revoked state
    create: {
      certificateNumber: revokedCertNum,
      studentId: alexUser.id,
      issuerId: oxfordUser.id,
      title: 'Introductory Blockchain Technologies (Legacy)',
      description: 'Superseded by M.Sc. Curriculum update.',
      type: 'COURSE_COMPLETION',
      status: 'REVOKED',
      badgeLevel: 'BRONZE',
      issuedAt: revokedIssuedDate,
      revokedAt: new Date('2024-11-01T08:00:00Z'),
      revocationReason: 'Credential superseded by upgraded Master of Science degree program.',
      credentialHash: revokedHash,
      merkleRoot: revokedHash,
      digitalSignature: revokedSigRes.signature,
      onChainRevocationStatus: 'REVOKE_PENDING',
    },
  });

  console.log('--- Development Seeding Completed Successfully! ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
