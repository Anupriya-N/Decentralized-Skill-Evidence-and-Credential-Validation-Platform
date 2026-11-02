export const INITIAL_USERS = [
  {
    id: 'user-student-01',
    fullName: 'Alex Chen',
    email: 'student@example.com',
    password: 'student123',
    role: 'student',
    profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    college: 'Metropolitan Institute of Technology',
    department: 'Computer Science & Engineering',
    graduationYear: '2026',
    bio: 'Aspiring Full-Stack & Blockchain Developer passionate about verifiable credentials, cloud microservices, and distributed consensus.',
    accountStatus: 'active',
    createdAt: '2025-01-15T08:30:00Z',
    updatedAt: '2025-09-10T14:20:00Z',
    isPortfolioPublic: true
  },
  {
    id: 'user-recruiter-01',
    fullName: 'Sarah Jenkins',
    email: 'recruiter@example.com',
    password: 'recruiter123',
    role: 'recruiter',
    company: 'Apex Talent Global / Nexus Cloud Solutions',
    position: 'Senior Technical Talent Partner',
    profileImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    accountStatus: 'active',
    createdAt: '2025-02-01T10:00:00Z',
    savedCandidateIds: ['user-student-01']
  },
  {
    id: 'user-issuer-01',
    fullName: 'Dr. Marcus Vance',
    email: 'issuer@example.com',
    password: 'issuer123',
    role: 'issuer',
    issuerId: 'iss-001',
    organizationName: 'Global Cloud & Tech Certification Authority',
    position: 'Academic Registrar & Director of Certifications',
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    accountStatus: 'active',
    createdAt: '2024-11-10T09:15:00Z'
  },
  {
    id: 'user-admin-01',
    fullName: 'Elena Rostova',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    position: 'Lead Platform Administrator',
    profileImage: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
    accountStatus: 'active',
    createdAt: '2024-08-01T00:00:00Z'
  }
];
