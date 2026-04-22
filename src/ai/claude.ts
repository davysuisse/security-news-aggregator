import type { ClassificationResult, NewsItem } from '../types';

const SYSTEM_PROMPT = `You are a senior security intelligence analyst specializing in Application Security, Identity & Access Management, and Security Champion programs. You analyze security articles and provide structured classification for a security news aggregator used by Security Architects and AppSec leadership.

Domain definitions:
- AppSec: Covers secure SDLC, vulnerability classes (XSS, SQLi, SSRF, etc.), API security, SAST/DAST, code security, CVEs in web/mobile/cloud applications, supply chain attacks, container/k8s security.
- IAM: Covers OAuth 2.0, OIDC, SAML, MFA/2FA bypass, PAM (Privileged Access), Zero Trust architecture, SSO, identity federation, RBAC/ABAC, directory services, credential attacks, session management.
- SecChampion: Covers developer security enablement, security culture, security training/awareness programs, DevSecOps, security tooling for developers, AppSec program management, shift-left security, bug bounties.

Signal scoring criteria:
- HIGH (0.75–1.0): Active exploitation in the wild, critical CVSS (9.0+), zero-day vulnerabilities, novel attack techniques, significant platform/vendor breaches, newly published weaponized exploits.
- MEDIUM (0.45–0.74): Important but not critical vulnerabilities, vendor security advisories, significant research findings, notable breaches without active exploitation, important configuration guidance.
- LOW (0.0–0.44): Informational articles, general best practices, security awareness content, minor updates, opinion pieces, historical analysis.

Framework mappings to consider:
- OWASP Top 10: A01-Broken Access Control, A02-Cryptographic Failures, A03-Injection, A04-Insecure Design, A05-Security Misconfiguration, A06-Vulnerable Components, A07-Auth Failures, A08-Software Integrity, A09-Logging Failures, A10-SSRF
- NIST CSF: ID (Identify), PR (Protect), DE (Detect), RS (Respond), RC (Recover)
- NIST SP 800-53 control families where relevant

Return ONLY valid JSON with no markdown, no explanation, no code blocks.`;

export async function classifyAndEnrich(item: NewsItem, apiKey: string): Promise<ClassificationResult> {
  const userPrompt = `Analyze this security article and return a JSON classification.

Title: ${item.title}
Source: ${item.source_name}
Content: ${item.raw_content?.slice(0, 3000) || item.title}

Return this exact JSON structure:
{
  "domains": [
    {"domain": "AppSec", "confidence": 0.0, "reasons": ["reason1"]},
    {"domain": "IAM", "confidence": 0.0, "reasons": ["reason1"]},
    {"domain": "SecChampion", "confidence": 0.0, "reasons": ["reason1"]}
  ],
  "relevance_score": 0.5,
  "signal_level": "MEDIUM",
  "summary": "2-3 sentence technical summary for security architects",
  "executive_summary": "1-2 sentence business-level summary for leadership",
  "technical_details": "Technical details: affected components, attack vectors, CVE IDs if applicable",
  "why_it_matters": "Why AppSec/IAM/SecChampion teams should care about this",
  "suggested_actions": "Concrete recommended actions: patch versions, config changes, detection rules",
  "frameworks": ["OWASP Top 10 A03:2021", "NIST CSF PR.AC"],
  "affected_technologies": ["technology1", "technology2"]
}

Rules:
- Include all three domains but set confidence=0 for irrelevant ones (only include domain in output if confidence > 0.3)
- relevance_score must be 0.0–1.0
- signal_level must be HIGH, MEDIUM, or LOW
- frameworks array may be empty if no clear mapping
- affected_technologies should be specific (e.g. "OAuth 2.0", "Node.js", "Kubernetes") not generic`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json() as {
    content: Array<{ type: string; text: string }>;
  };

  const text = data.content?.[0]?.text;
  if (!text) throw new Error('Empty response from Claude');

  const parsed = JSON.parse(text) as {
    domains: Array<{ domain: string; confidence: number; reasons: string[] }>;
    relevance_score: number;
    signal_level: string;
    summary: string;
    executive_summary: string;
    technical_details: string;
    why_it_matters: string;
    suggested_actions: string;
    frameworks: string[];
    affected_technologies: string[];
  };

  const domains = parsed.domains
    .filter(d => d.confidence > 0.3)
    .map(d => ({
      domain: d.domain as 'AppSec' | 'IAM' | 'SecChampion',
      confidence: Math.min(1, Math.max(0, d.confidence)),
      reasons: d.reasons || [],
    }));

  const relevance_score = Math.min(1, Math.max(0, parsed.relevance_score ?? 0.5));
  const signal_level = (['HIGH', 'MEDIUM', 'LOW'].includes(parsed.signal_level)
    ? parsed.signal_level
    : 'MEDIUM') as 'HIGH' | 'MEDIUM' | 'LOW';

  return {
    domains,
    relevance_score,
    signal_level,
    summary: parsed.summary || '',
    executive_summary: parsed.executive_summary || '',
    technical_details: parsed.technical_details || '',
    why_it_matters: parsed.why_it_matters || '',
    suggested_actions: parsed.suggested_actions || '',
    frameworks: parsed.frameworks || [],
    affected_technologies: parsed.affected_technologies || [],
  };
}

export function buildDigest(items: NewsItem[]): string {
  const high = items.filter(i => i.signal_level === 'HIGH');
  const medium = items.filter(i => i.signal_level === 'MEDIUM');

  const domainGroups: Record<string, NewsItem[]> = { AppSec: [], IAM: [], SecChampion: [] };
  for (const item of items) {
    for (const d of item.domains) {
      if (d.confidence > 0.5) domainGroups[d.domain]?.push(item);
    }
  }

  let digest = `# Security Intelligence Digest\n*${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}*\n\n`;
  digest += `**Summary:** ${items.length} items analyzed · ${high.length} HIGH signal · ${medium.length} MEDIUM signal\n\n`;

  if (high.length > 0) {
    digest += `## 🔴 High Signal Items\n\n`;
    for (const item of high.slice(0, 10)) {
      digest += `### ${item.title}\n`;
      digest += `*${item.source_name} · ${new Date(item.published_at).toLocaleDateString()}*\n\n`;
      digest += `${item.executive_summary || item.summary || ''}\n\n`;
      if (item.suggested_actions) digest += `**Actions:** ${item.suggested_actions}\n\n`;
      digest += `[Read more](${item.url})\n\n---\n\n`;
    }
  }

  for (const [domain, domItems] of Object.entries(domainGroups)) {
    const top = domItems.filter(i => i.signal_level !== 'HIGH').slice(0, 5);
    if (top.length === 0) continue;
    digest += `## ${domain} Highlights\n\n`;
    for (const item of top) {
      digest += `- **[${item.title}](${item.url})** — ${item.executive_summary || item.summary || ''}\n`;
    }
    digest += '\n';
  }

  return digest;
}
