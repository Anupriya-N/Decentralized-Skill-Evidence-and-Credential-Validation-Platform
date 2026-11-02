/**
 * Mock AI Adapter (Skill Intelligence & Certificate OCR Suggestions)
 * Provides assistive, reviewable suggestions with explicit human-in-the-loop confirmation.
 * Clearly labelled as "AI Demo Suggestion".
 */

export const mockAIAdapter = {
  isMock: true,

  /**
   * Simulates OCR extraction from certificate file
   * @param {File} file 
   * @param {string} studentName
   * @param {Array} existingCredentials
   * @returns {Promise<object>}
   */
  async extractCertificateDetails(file, studentName = 'Student', existingCredentials = []) {
    await new Promise(resolve => setTimeout(resolve, 800));

    const fileNameLower = (file?.name || '').toLowerCase();

    // Check for potential duplicate in existing credentials
    const potentialDuplicate = (existingCredentials || []).find(c => 
      c.fileName?.toLowerCase() === fileNameLower ||
      (file?.size && c.fileSize === file.size)
    );

    let baseSuggestion = {
      isSuggestion: true,
      extractedStudentName: studentName || 'Student',
      confidence: 0.94,
      suggestedTitle: 'AWS Certified Solutions Architect - Associate',
      suggestedIssuer: 'Global Cloud & Tech Certification Authority',
      suggestedIssueDate: '2025-01-15',
      suggestedExpiryDate: '2028-01-15',
      suggestedSkillName: 'AWS Cloud Architecture & S3',
      suggestedCategory: 'Cloud Computing',
      suggestedDescription: 'Demonstrated proficiency in compute, storage, networking, database architecture, and deployment automation on AWS.',
      extractedKeywords: ['Amazon Web Services', 'VPC', 'EC2', 'S3', 'IAM', 'High Availability'],
      missingInformation: [],
      evidenceToSkillMatching: [
        { skillName: 'AWS Cloud Architecture & S3', confidence: 0.96, category: 'Cloud Computing' },
        { skillName: 'Cloud Infrastructure & AWS', confidence: 0.91, category: 'Cloud Computing' }
      ]
    };

    if (fileNameLower.includes('python') || fileNameLower.includes('data')) {
      baseSuggestion = {
        isSuggestion: true,
        extractedStudentName: studentName || 'Student',
        confidence: 0.91,
        suggestedTitle: 'Professional Python for Data Engineering',
        suggestedIssuer: 'Metropolitan Institute of Technology',
        suggestedIssueDate: '2024-11-20',
        suggestedExpiryDate: '',
        suggestedSkillName: 'Python, ETL & Pandas',
        suggestedCategory: 'Data Science',
        suggestedDescription: 'Completed advanced coursework in distributed Pandas workflows, pipeline scheduling, and ETL performance tuning.',
        extractedKeywords: ['Python 3', 'Pandas', 'ETL', 'Data Wrangling', 'SQL', 'Data Pipelines'],
        missingInformation: ['Expiration date not specified on certificate (assumed lifetime validity).'],
        evidenceToSkillMatching: [
          { skillName: 'Python, ETL & Pandas', confidence: 0.95, category: 'Data Science' },
          { skillName: 'Data Engineering', confidence: 0.88, category: 'Data Science' }
        ]
      };
    } else if (!fileNameLower.includes('aws') && !fileNameLower.includes('cloud')) {
      baseSuggestion = {
        isSuggestion: true,
        extractedStudentName: studentName || 'Student',
        confidence: 0.88,
        suggestedTitle: 'Full-Stack Web Application Development Certificate',
        suggestedIssuer: 'Metropolitan Institute of Technology',
        suggestedIssueDate: '2025-01-10',
        suggestedExpiryDate: '',
        suggestedSkillName: 'Full-Stack Software Architecture',
        suggestedCategory: 'Web Development',
        suggestedDescription: 'Validated proficiency in modern front-end engineering, RESTful API design, database modeling, and authentication systems.',
        extractedKeywords: ['JavaScript', 'React', 'Node.js', 'REST API', 'Database Systems'],
        missingInformation: ['Expiration date not present.'],
        evidenceToSkillMatching: [
          { skillName: 'Full-Stack Software Architecture', confidence: 0.93, category: 'Programming' },
          { skillName: 'React.js & Modern Web UI', confidence: 0.89, category: 'Web Development' }
        ]
      };
    }

    return {
      ...baseSuggestion,
      duplicateWarning: potentialDuplicate ? {
        found: true,
        matchedCredentialId: potentialDuplicate.credentialId,
        matchedTitle: potentialDuplicate.title,
        message: `Warning: A certificate with identical file attributes "${potentialDuplicate.title}" (${potentialDuplicate.credentialId}) was previously registered.`
      } : null,
      statusWorkflow: {
        aiExtraction: 'COMPLETED',
        aiAnalysis: 'COMPLETED',
        issuerVerification: 'PENDING',
        blockchainAnchor: 'PENDING'
      }
    };
  },

  /**
   * Suggests skill category and normalized taxonomy tags
   */
  async categorizeSkill(skillName) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const lower = (skillName || '').toLowerCase();
    
    if (lower.includes('cloud') || lower.includes('aws') || lower.includes('azure')) return 'Cloud Computing';
    if (lower.includes('ai') || lower.includes('learning') || lower.includes('neural') || lower.includes('gpt')) return 'AI / Machine Learning';
    if (lower.includes('data') || lower.includes('sql') || lower.includes('pandas')) return 'Data Science';
    if (lower.includes('security') || lower.includes('audit') || lower.includes('penetration')) return 'Cybersecurity';
    if (lower.includes('blockchain') || lower.includes('solidity') || lower.includes('smart contract')) return 'Blockchain';
    if (lower.includes('docker') || lower.includes('kubernetes') || lower.includes('ci/cd')) return 'DevOps';
    if (lower.includes('react') || lower.includes('web') || lower.includes('frontend')) return 'Web Development';
    return 'Programming';
  },

  /**
   * Compares student portfolio against a candidate job description
   */
  async analyzeJobSkillGap(jobDescription, studentSkills) {
    await new Promise(resolve => setTimeout(resolve, 800));

    const extractedRequirements = [
      { name: 'Cloud Infrastructure & AWS', importance: 'Required', category: 'Cloud Computing' },
      { name: 'Full-Stack Software Architecture', importance: 'Required', category: 'Programming' },
      { name: 'React.js & Modern Web UI', importance: 'Required', category: 'Web Development' },
      { name: 'Docker & Kubernetes', importance: 'Preferred', category: 'DevOps' },
      { name: 'Microservices & Distributed Systems', importance: 'Preferred', category: 'Programming' },
      { name: 'GraphQL & Apollo', importance: 'Bonus', category: 'Web Development' }
    ];

    const matchedVerified = [];
    const matchedSelfReported = [];
    const missingSkills = [];

    extractedRequirements.forEach(req => {
      const match = (studentSkills || []).find(s => 
        s.name.toLowerCase().includes(req.name.toLowerCase()) || 
        req.name.toLowerCase().includes(s.name.toLowerCase())
      );
      if (match) {
        if (!match.isSelfReported && match.evidenceCredentialIds?.length > 0) {
          matchedVerified.push({ ...req, studentSkill: match });
        } else {
          matchedSelfReported.push({ ...req, studentSkill: match });
        }
      } else {
        missingSkills.push(req);
      }
    });

    const totalReq = extractedRequirements.length;
    const matchScore = Math.round(((matchedVerified.length * 1.0 + matchedSelfReported.length * 0.5) / totalReq) * 100);

    return {
      isSuggestion: true,
      matchScore,
      matchedVerified,
      matchedSelfReported,
      missingSkills,
      summaryAdvice: `Strong match (${matchScore}%) for Core Cloud and Full-Stack Engineering roles. To elevate your evidence profile, consider adding verifiable credentials for container orchestration (Docker/Kubernetes).`,
      analyzedAt: new Date().toISOString()
    };
  },

  /**
   * Generates a concise portfolio summary based only on confirmed student profile & credentials
   */
  async generatePortfolioSummary(profile, credentials, skills) {
    await new Promise(resolve => setTimeout(resolve, 500));
    const verifiedCount = (credentials || []).filter(c => c.integrityStatus === 'verified' && c.issuerStatus === 'trusted').length;
    const topSkills = (skills || []).slice(0, 3).map(s => s.name).join(', ');

    return {
      isSuggestion: true,
      draftSummary: `${profile?.fullName || 'Student'} is a ${profile?.department || 'Computer Science'} graduate from ${profile?.college || 'University'} with ${verifiedCount} blockchain-verified credential(s). Core evidenced competencies include ${topSkills || 'Software Engineering'}. Demonstrates verified expertise in building resilient, verifiable digital systems.`,
      generatedAt: new Date().toISOString()
    };
  }
};
