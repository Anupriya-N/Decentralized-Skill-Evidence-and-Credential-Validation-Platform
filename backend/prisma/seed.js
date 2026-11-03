import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

function computeSha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function main() {
  console.log('--- Starting CertiTrust Database Seeding (JavaScript) ---');

  // Clean existing data in reverse order of foreign keys
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.verificationLog.deleteMany();
  await prisma.blockchainAnchor.deleteMany();
  await prisma.credentialSkill.deleteMany();
  await prisma.credential.deleteMany();
  await prisma.evidenceReview.deleteMany();
  await prisma.evidenceSkill.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.studentSkill.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.employerProfile.deleteMany();
  await prisma.institutionProfile.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const standardPasswordHash = await bcrypt.hash('Password123!', 10);
  const adminPasswordHash = await bcrypt.hash('AdminSecure2026!', 10);

  // 1. Create Users
  console.log('Seeding Users...');
  const alexUser = await prisma.user.create({
    data: {
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

  const mariaUser = await prisma.user.create({
    data: {
      email: 'maria.santos@student.edu',
      passwordHash: standardPasswordHash,
      name: 'Maria Santos',
      role: 'STUDENT',
      isVerified: true,
      walletAddress: '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      profile: {
        create: {
          headline: 'Web3 Security Researcher & Smart Contract Engineer',
          bio: 'Focused on formal verification, auditing EVM contracts, and zero-knowledge protocols.',
          location: 'Cambridge, MA',
        },
      },
      studentProfile: {
        create: {
          studentNumber: 'MIT-2024-SEC-104',
          degreeProgram: 'B.Sc. in Computer Science',
          graduationYear: 2026,
          gpa: 3.92,
          githubUsername: 'mariasantos-sec',
          portfolioSlug: 'maria-santos',
          isPortfolioPublic: true,
        },
      },
    },
    include: { studentProfile: true },
  });

  const oxfordUser = await prisma.user.create({
    data: {
      email: 'oxford@institution.edu',
      passwordHash: standardPasswordHash,
      name: 'Oxford University',
      role: 'INSTITUTION',
      isVerified: true,
      walletAddress: '0x53d284357ec70cE289D6D64134DfAc8E511c8a3D',
      avatarUrl: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=150',
      institutionProfile: {
        create: {
          institutionName: 'Oxford University',
          accreditationBody: 'UK Higher Education Standards Agency',
          accreditationNumber: 'UK-HESA-98210',
          isAccredited: true,
          officialDomain: 'ox.ac.uk',
          signingPublicKey: '0x04e6c99c36bfb1b7f0e698...',
          contactEmail: 'registry@ox.ac.uk',
          country: 'GB',
        },
      },
    },
  });

  const mitUser = await prisma.user.create({
    data: {
      email: 'mit@institution.edu',
      passwordHash: standardPasswordHash,
      name: 'MIT Open Learning',
      role: 'INSTITUTION',
      isVerified: true,
      walletAddress: '0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73',
      avatarUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?w=150',
      institutionProfile: {
        create: {
          institutionName: 'MIT Open Learning',
          accreditationBody: 'New England Commission of Higher Education',
          accreditationNumber: 'US-NECHE-44120',
          isAccredited: true,
          officialDomain: 'mit.edu',
          signingPublicKey: '0x048291f092ab716c0291...',
          contactEmail: 'credentials@mit.edu',
          country: 'US',
        },
      },
    },
  });

  const recruiterUser = await prisma.user.create({
    data: {
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

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@certitrust.io',
      passwordHash: adminPasswordHash,
      name: 'System Administrator',
      role: 'ADMIN',
      isVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    },
  });

  // 2. Standardized Skills
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

  const createdSkills = {};
  for (const s of skillsData) {
    const skill = await prisma.skill.create({ data: s });
    createdSkills[s.code] = skill;
  }

  // Link Skills to Alex Chen
  if (alexUser.studentProfile) {
    await prisma.studentSkill.createMany({
      data: [
        { studentId: alexUser.studentProfile.id, skillId: createdSkills['SOLIDITY_CORE'].id, proficiency: 'ADVANCED', score: 94.5, isVerified: true, endorsementCount: 4 },
        { studentId: alexUser.studentProfile.id, skillId: createdSkills['SMART_CONTRACTS'].id, proficiency: 'ADVANCED', score: 92.0, isVerified: true, endorsementCount: 3 },
        { studentId: alexUser.studentProfile.id, skillId: createdSkills['REACT_DEV'].id, proficiency: 'EXPERT', score: 96.0, isVerified: true, endorsementCount: 5 },
        { studentId: alexUser.studentProfile.id, skillId: createdSkills['POSTGRES_SQL'].id, proficiency: 'ADVANCED', score: 88.0, isVerified: true, endorsementCount: 2 },
        { studentId: alexUser.studentProfile.id, skillId: createdSkills['SECURITY_AUDIT'].id, proficiency: 'INTERMEDIATE', score: 84.0, isVerified: true, endorsementCount: 2 },
      ],
    });
  }

  // 3. Evidence Items
  console.log('Seeding Evidence...');
  const evidence1 = await prisma.evidence.create({
    data: {
      studentId: alexUser.id,
      title: 'Decentralized Escrow Smart Contract Audit Report',
      description: 'Complete security analysis and formal verification of multi-sig escrow protocol.',
      evidenceType: 'PROJECT',
      status: 'APPROVED',
      sha256Hash: computeSha256('evidence-mock-alex-escrow-contract-sample-2026'),
      fileUrl: '/uploads/evidence/escrow-audit-report.pdf',
      fileName: 'escrow-audit-report.pdf',
      fileSizeBytes: 245100,
      mimeType: 'application/pdf',
      extractedSkills: ['Solidity', 'Smart Contract Security', 'Slither'],
      aiConfidence: 0.96,
      skills: {
        create: [
          { skillId: createdSkills['SOLIDITY_CORE'].id, relevanceScore: 0.95 },
          { skillId: createdSkills['SECURITY_AUDIT'].id, relevanceScore: 0.98 },
        ],
      },
      reviews: {
        create: {
          reviewerId: oxfordUser.id,
          decision: 'APPROVED',
          score: 95.0,
          feedback: 'Rigorous security evaluation with thorough reentrancy mitigations demonstrated.',
        },
      },
    },
  });

  // 4. Issue Credentials
  console.log('Seeding Credentials...');
  const cred1Hash = computeSha256('cred-oxford-alex-msc-distributed-systems-2025');
  const cred1 = await prisma.credential.create({
    data: {
      certificateNumber: 'OXF-2025-CS-00491',
      studentId: alexUser.id,
      issuerId: oxfordUser.id,
      title: 'Master of Science in Distributed Computing & Blockchain',
      description: 'Awarded for advanced research in distributed consensus, fault tolerance, and EVM architecture.',
      type: 'DEGREE',
      status: 'ACTIVE',
      badgeLevel: 'GOLD',
      grade: 'Distinction (First Class)',
      courseCode: 'CS-892',
      issuedAt: new Date('2025-06-20T10:00:00Z'),
      credentialHash: cred1Hash,
      merkleRoot: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
      digitalSignature: '0x3045022100e4b8...oxford_rsa_signature_verified',
      qrCodeUrl: `/api/v1/credentials/qr/OXF-2025-CS-00491`,
      skills: {
        create: [
          { skillId: createdSkills['SOLIDITY_CORE'].id, weight: 1.0 },
          { skillId: createdSkills['SMART_CONTRACTS'].id, weight: 1.0 },
          { skillId: createdSkills['SECURITY_AUDIT'].id, weight: 0.8 },
        ],
      },
      blockchainAnchor: {
        create: {
          network: 'Ethereum Sepolia',
          contractAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
          transactionHash: '0x8f192b4912c74829104a9e8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d',
          blockNumber: BigInt(5821940),
          merkleRoot: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
          merkleProof: ['0x1111...', '0x2222...'],
          isConfirmed: true,
        },
      },
    },
  });

  const cred2Hash = computeSha256('cred-mit-alex-smart-contract-security-2025');
  const cred2 = await prisma.credential.create({
    data: {
      certificateNumber: 'MIT-2025-SEC-0198',
      studentId: alexUser.id,
      issuerId: mitUser.id,
      title: 'Advanced Smart Contract Security Specialist',
      description: 'Comprehensive certification covering EVM byte-code analysis, reentrancy vectors, and formal verification.',
      type: 'CERTIFICATE',
      status: 'ACTIVE',
      badgeLevel: 'PLATINUM',
      grade: 'Top 2% Performance',
      courseCode: 'MIT-SEC-401',
      issuedAt: new Date('2025-08-15T14:30:00Z'),
      credentialHash: cred2Hash,
      merkleRoot: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
      digitalSignature: '0x3046022100f9a2...mit_ecdsa_signature_verified',
      qrCodeUrl: `/api/v1/credentials/qr/MIT-2025-SEC-0198`,
      skills: {
        create: [
          { skillId: createdSkills['SECURITY_AUDIT'].id, weight: 1.0 },
          { skillId: createdSkills['SOLIDITY_CORE'].id, weight: 0.9 },
        ],
      },
      blockchainAnchor: {
        create: {
          network: 'Ethereum Sepolia',
          contractAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
          transactionHash: '0x3d7b8912c9842a1b7e456c8d90123456789abcdef0123456789abcdef0123456',
          blockNumber: BigInt(5894120),
          merkleRoot: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
          merkleProof: ['0x3333...', '0x4444...'],
          isConfirmed: true,
        },
      },
    },
  });

  // Sample Revoked Credential for testing revocation verification
  const credRevokedHash = computeSha256('cred-oxford-alex-revoked-sample-2024');
  await prisma.credential.create({
    data: {
      certificateNumber: 'OXF-2024-LEGACY-0012',
      studentId: alexUser.id,
      issuerId: oxfordUser.id,
      title: 'Introductory Blockchain Technologies (Legacy)',
      description: 'Superceded by M.Sc. Curriculum update.',
      type: 'COURSE_COMPLETION',
      status: 'REVOKED',
      badgeLevel: 'BRONZE',
      issuedAt: new Date('2024-03-10T10:00:00Z'),
      revokedAt: new Date('2024-11-01T08:00:00Z'),
      revocationReason: 'Credential superseded by upgraded Master of Science degree program.',
      credentialHash: credRevokedHash,
      digitalSignature: '0x3045...oxford_revoked_sig',
    },
  });

  // Initial Verification Log
  await prisma.verificationLog.create({
    data: {
      credentialId: cred1.id,
      verifierId: recruiterUser.id,
      verificationScore: 100.0,
      checksPassed: {
        signatureValid: true,
        notRevoked: true,
        notExpired: true,
        issuerAccredited: true,
        merkleRootMatch: true,
        blockchainRecorded: true,
      },
      status: 'VALID',
    },
  });

  console.log('--- Database Seeding Completed Successfully! ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
