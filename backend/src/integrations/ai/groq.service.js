import Groq from 'groq-sdk';
import { env } from '../../config/env.js';
import { z } from 'zod';
import { AppError } from '../../utils/errors.js';

const aiSkillOutputSchema = z.object({
  skills: z.array(
    z.object({
      name: z.string().min(1),
      category: z.enum([
        'BLOCKCHAIN',
        'FRONTEND',
        'BACKEND',
        'DATABASE',
        'SECURITY',
        'CLOUD',
        'DATA_SCIENCE',
        'SOFT_SKILLS',
        'OTHER',
      ]).default('OTHER'),
      confidence: z.number().min(0).max(1).default(0.8),
      proficiency: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).default('INTERMEDIATE'),
    })
  ),
  summary: z.string().default(''),
});

const aiGapAnalysisSchema = z.object({
  matchPercentage: z.number().min(0).max(100),
  matchingSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  strengths: z.array(z.string()),
  learningRecommendations: z.array(z.string()),
  executiveSummary: z.string(),
});

export class GroqService {
  constructor() {
    this.isConfigured = Boolean(env.GROQ_API_KEY && env.GROQ_API_KEY.startsWith('gsk_'));
    if (this.isConfigured) {
      this.groq = new Groq({ apiKey: env.GROQ_API_KEY });
    } else {
      this.groq = null;
    }
    this.model = env.GROQ_MODEL || 'openai/gpt-oss-20b';
  }

  /**
   * Health and status check for AI integration
   */
  getStatus() {
    return {
      isConfigured: this.isConfigured,
      model: this.model,
      provider: 'Groq Cloud',
    };
  }

  /**
   * Execute Groq chat completion with 1 automatic retry on transient error
   */
  async executeChat(options, maxRetries = 1) {
    if (!this.groq) {
      throw new AppError('Groq AI service is not configured (missing or invalid GROQ_API_KEY)', 503);
    }

    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.groq.chat.completions.create({
          model: this.model,
          temperature: 0.1,
          ...options,
        });
        return response;
      } catch (error) {
        lastError = error;
        // Don't retry if client error (like 400 Bad Request or 401 Unauthorized)
        if (error.status === 401 || error.status === 400) {
          throw new AppError(`Groq AI Authentication/Request Error: ${error.message}`, 502);
        }
        if (attempt < maxRetries) {
          // Wait 500ms before retrying transient errors
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    }

    throw new AppError(`Groq AI request failed after retries: ${lastError.message}`, 503);
  }

  /**
   * Extract technical skills and classifications from raw text or parsed PDF resume/evidence
   */
  async extractSkills(text) {
    if (!text || text.trim().length === 0) {
      throw new AppError('No text provided for skill analysis', 400);
    }

    const prompt = `
You are an expert AI technical recruiter and credential auditor for CertiTrust.
Analyze the following portfolio/evidence text and extract only genuinely present technical skills.
Categorize each skill into one of: BLOCKCHAIN, FRONTEND, BACKEND, DATABASE, SECURITY, CLOUD, DATA_SCIENCE, SOFT_SKILLS, OTHER.
Assign estimated proficiency: BEGINNER, INTERMEDIATE, ADVANCED, EXPERT.
Assign confidence between 0.0 and 1.0.

Evidence/Document Text:
"""
${text.slice(0, 8000)}
"""

Respond ONLY with valid JSON in this exact structure:
{
  "skills": [
    {
      "name": "Skill Name",
      "category": "BLOCKCHAIN",
      "confidence": 0.95,
      "proficiency": "ADVANCED"
    }
  ],
  "summary": "Brief 1-2 sentence overview of verified competencies."
}
`;

    try {
      const response = await this.executeChat({
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);
      const validated = aiSkillOutputSchema.safeParse(parsed);

      if (validated.success) {
        return {
          status: 'AI_COMPLETED',
          ...validated.data,
        };
      }

      return {
        status: 'AI_COMPLETED',
        skills: [],
        summary: 'Document analyzed, but no structured technical competencies could be validated.',
      };
    } catch (error) {
      console.warn('Groq AI extraction notice (no fabricated fallback):', error.message);
      return {
        status: 'AI_PENDING',
        skills: [],
        summary: 'AI analysis temporarily pending due to service unavailability.',
        error: error.message,
      };
    }
  }

  /**
   * Perform skill gap analysis between candidate verified skills and a job description
   */
  async analyzeSkillGap(jobTitle, requiredSkills = [], studentSkills = []) {
    const prompt = `
You are an AI talent assessor for CertiTrust.
Compare the candidate's verified skills against the required job qualifications.

Target Role: ${jobTitle}
Required Skills: ${JSON.stringify(requiredSkills)}
Candidate Verified Skills: ${JSON.stringify(studentSkills)}

Respond ONLY with valid JSON in this format:
{
  "matchPercentage": 85,
  "matchingSkills": ["Skill 1"],
  "missingSkills": ["Skill 2"],
  "strengths": ["Strengths demonstrated"],
  "learningRecommendations": ["Courses/certifications recommended"],
  "executiveSummary": "Candidate summary"
}
`;

    try {
      const response = await this.executeChat({
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);
      const validated = aiGapAnalysisSchema.safeParse(parsed);

      if (validated.success) {
        return { status: 'AI_COMPLETED', ...validated.data };
      }
    } catch (error) {
      console.warn('Groq AI gap analysis notice:', error.message);
    }

    // Deterministic algorithmic fallback if AI is unavailable (calculates actual string overlap)
    const matched = studentSkills.filter((s) =>
      requiredSkills.some((req) => req.toLowerCase() === s.toLowerCase())
    );
    const missing = requiredSkills.filter(
      (req) => !studentSkills.some((s) => s.toLowerCase() === req.toLowerCase())
    );
    const pct = requiredSkills.length > 0 ? Math.round((matched.length / requiredSkills.length) * 100) : 0;

    return {
      status: 'ALGORITHMIC_MATCH',
      matchPercentage: pct,
      matchingSkills: matched,
      missingSkills: missing,
      strengths: matched.length > 0 ? [`Demonstrated competencies in: ${matched.join(', ')}`] : [],
      learningRecommendations: missing.map((m) => `Acquire accredited certification in ${m}`),
      executiveSummary: `Algorithmic candidate match: ${pct}% overlap with listed requirements.`,
    };
  }

  /**
   * Student AI assistant chat
   */
  async chatAssistant(messages = []) {
    const systemPrompt = {
      role: 'system',
      content: `You are the CertiTrust AI Career & Credential Advisor.
Guide candidates on verifying blockchain credentials, uploading verifiable work evidence, and preparing for software engineering and Web3 roles.
Keep answers informative, encouraging, concise, and professional.`,
    };

    try {
      const response = await this.executeChat({
        messages: [systemPrompt, ...messages],
        temperature: 0.7,
        max_tokens: 1024,
      });

      return response.choices[0]?.message?.content || 'I could not process your inquiry at this moment.';
    } catch (error) {
      console.warn('Groq AI chat error:', error.message);
      return 'The CertiTrust AI Advisor is currently busy or temporarily unreachable. Please try again in a few moments.';
    }
  }
}

export const groqService = new GroqService();
