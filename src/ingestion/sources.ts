import type { SourceType } from '../types';

export interface SourceDef {
  name: string;
  url: string;
  feed_url: string;
  source_type: SourceType;
  credibility_score: number;
}

export const DEFAULT_SOURCES: SourceDef[] = [
  {
    name: 'Krebs on Security',
    url: 'https://krebsonsecurity.com',
    feed_url: 'https://krebsonsecurity.com/feed/',
    source_type: 'rss',
    credibility_score: 0.95,
  },
  {
    name: 'The Hacker News',
    url: 'https://thehackernews.com',
    feed_url: 'https://feeds.feedburner.com/TheHackersNews',
    source_type: 'rss',
    credibility_score: 0.82,
  },
  {
    name: 'PortSwigger Research',
    url: 'https://portswigger.net/research',
    feed_url: 'https://portswigger.net/research/rss',
    source_type: 'rss',
    credibility_score: 0.93,
  },
  {
    name: 'Google Project Zero',
    url: 'https://googleprojectzero.blogspot.com',
    feed_url: 'https://googleprojectzero.blogspot.com/feeds/posts/default',
    source_type: 'atom',
    credibility_score: 0.97,
  },
  {
    name: 'GitHub Security Lab',
    url: 'https://securitylab.github.com',
    feed_url: 'https://github.blog/tag/security-research/feed/',
    source_type: 'rss',
    credibility_score: 0.92,
  },
  {
    name: 'CISA Advisories',
    url: 'https://www.cisa.gov',
    feed_url: 'https://www.cisa.gov/uscert/ncas/alerts.xml',
    source_type: 'rss',
    credibility_score: 1.0,
  },
  {
    name: 'OWASP Blog',
    url: 'https://owasp.org',
    feed_url: 'https://owasp.org/feed.xml',
    source_type: 'rss',
    credibility_score: 0.97,
  },
  {
    name: 'Snyk Security Blog',
    url: 'https://snyk.io/blog',
    feed_url: 'https://snyk.io/blog/feed/',
    source_type: 'rss',
    credibility_score: 0.85,
  },
  {
    name: 'Auth0 Blog',
    url: 'https://auth0.com/blog',
    feed_url: 'https://auth0.com/blog/rss.xml',
    source_type: 'rss',
    credibility_score: 0.80,
  },
  {
    name: 'Troy Hunt Blog',
    url: 'https://www.troyhunt.com',
    feed_url: 'https://feeds.feedburner.com/TroyHunt',
    source_type: 'rss',
    credibility_score: 0.90,
  },
  {
    name: 'Schneier on Security',
    url: 'https://www.schneier.com',
    feed_url: 'https://www.schneier.com/feed/atom/',
    source_type: 'atom',
    credibility_score: 0.93,
  },
  {
    name: 'Dark Reading',
    url: 'https://www.darkreading.com',
    feed_url: 'https://www.darkreading.com/rss.xml',
    source_type: 'rss',
    credibility_score: 0.78,
  },

  // IAM / OAuth 2.0 / OIDC
  {
    name: 'Okta Security Blog',
    url: 'https://sec.okta.com',
    feed_url: 'https://sec.okta.com/feed',
    source_type: 'rss',
    credibility_score: 0.88,
  },
  {
    name: 'Microsoft Entra Identity Blog',
    url: 'https://techcommunity.microsoft.com/t5/microsoft-entra-blog/bg-p/Identity',
    feed_url: 'https://techcommunity.microsoft.com/t5/microsoft-entra-blog/bg-p/Identity/rss-board-message',
    source_type: 'rss',
    credibility_score: 0.90,
  },
  {
    name: 'Aaron Parecki (OAuth)',
    url: 'https://aaronparecki.com',
    feed_url: 'https://aaronparecki.com/feed.xml',
    source_type: 'atom',
    credibility_score: 0.92,
  },
  {
    name: 'Ping Identity Blog',
    url: 'https://www.pingidentity.com/en/company/blog.html',
    feed_url: 'https://www.pingidentity.com/feed.xml',
    source_type: 'rss',
    credibility_score: 0.83,
  },
  {
    name: 'ForgeRock / Ping Identity Community',
    url: 'https://backstage.forgerock.com/knowledge/blogs',
    feed_url: 'https://community.pingidentity.com/t5/s/global-rss-board-message',
    source_type: 'rss',
    credibility_score: 0.82,
  },
  {
    name: 'Identity Defined Security Alliance',
    url: 'https://www.idsalliance.org/blog',
    feed_url: 'https://www.idsalliance.org/blog/feed/',
    source_type: 'rss',
    credibility_score: 0.85,
  },
  {
    name: 'OpenID Foundation Blog',
    url: 'https://openid.net/blog',
    feed_url: 'https://openid.net/blog/feed/',
    source_type: 'rss',
    credibility_score: 0.93,
  },
  {
    name: 'Duo Security Blog',
    url: 'https://duo.com/blog',
    feed_url: 'https://duo.com/blog/rss',
    source_type: 'rss',
    credibility_score: 0.87,
  },
  {
    name: 'BeyondTrust Blog',
    url: 'https://www.beyondtrust.com/blog',
    feed_url: 'https://www.beyondtrust.com/blog/feed/',
    source_type: 'rss',
    credibility_score: 0.84,
  },
  {
    name: 'CyberArk Blog',
    url: 'https://www.cyberark.com/resources/blog',
    feed_url: 'https://www.cyberark.com/resources/blog/feed/',
    source_type: 'rss',
    credibility_score: 0.85,
  },

  // AI Security & AI Learning
  {
    name: 'Google DeepMind Blog',
    url: 'https://deepmind.google/blog',
    feed_url: 'https://deepmind.google/blog/rss.xml',
    source_type: 'rss',
    credibility_score: 0.95,
  },
  {
    name: 'MIT Technology Review – AI',
    url: 'https://www.technologyreview.com/topic/artificial-intelligence',
    feed_url: 'https://www.technologyreview.com/feed/',
    source_type: 'rss',
    credibility_score: 0.90,
  },
  {
    name: 'The Gradient',
    url: 'https://thegradient.pub',
    feed_url: 'https://thegradient.pub/rss/',
    source_type: 'rss',
    credibility_score: 0.88,
  },
  {
    name: 'Import AI (Jack Clark)',
    url: 'https://importai.substack.com',
    feed_url: 'https://importai.substack.com/feed',
    source_type: 'rss',
    credibility_score: 0.90,
  },
  {
    name: 'VentureBeat AI',
    url: 'https://venturebeat.com/category/ai',
    feed_url: 'https://venturebeat.com/category/ai/feed/',
    source_type: 'rss',
    credibility_score: 0.78,
  },
  {
    name: 'Trail of Bits Blog',
    url: 'https://blog.trailofbits.com',
    feed_url: 'https://blog.trailofbits.com/feed/',
    source_type: 'rss',
    credibility_score: 0.93,
  },
  {
    name: 'WIRED – Security',
    url: 'https://www.wired.com/category/security',
    feed_url: 'https://www.wired.com/feed/category/security/latest/rss',
    source_type: 'rss',
    credibility_score: 0.83,
  },

  // App Security Learning
  {
    name: 'NCC Group Research',
    url: 'https://research.nccgroup.com',
    feed_url: 'https://research.nccgroup.com/feed/',
    source_type: 'rss',
    credibility_score: 0.92,
  },
  {
    name: 'HackerOne Hacker101',
    url: 'https://www.hackerone.com/blog',
    feed_url: 'https://www.hackerone.com/blog.rss',
    source_type: 'rss',
    credibility_score: 0.85,
  },
  {
    name: 'Checkmarx Blog',
    url: 'https://checkmarx.com/blog',
    feed_url: 'https://checkmarx.com/blog/feed/',
    source_type: 'rss',
    credibility_score: 0.82,
  },
  {
    name: 'F5 Labs',
    url: 'https://www.f5.com/labs',
    feed_url: 'https://www.f5.com/labs/rss/articles',
    source_type: 'rss',
    credibility_score: 0.86,
  },
  {
    name: 'Secureworks Blog',
    url: 'https://www.secureworks.com/blog',
    feed_url: 'https://www.secureworks.com/blog/feed',
    source_type: 'rss',
    credibility_score: 0.85,
  },

  // Industry News & Analyst
  {
    name: 'Gartner Security Blog',
    url: 'https://blogs.gartner.com/security',
    feed_url: 'https://blogs.gartner.com/security/feed/',
    source_type: 'rss',
    credibility_score: 0.88,
  },
  {
    name: 'SecurityWeek',
    url: 'https://www.securityweek.com',
    feed_url: 'https://www.securityweek.com/feed/',
    source_type: 'rss',
    credibility_score: 0.82,
  },
  {
    name: 'Infosecurity Magazine',
    url: 'https://www.infosecurity-magazine.com',
    feed_url: 'https://www.infosecurity-magazine.com/rss/news/',
    source_type: 'rss',
    credibility_score: 0.80,
  },
  {
    name: 'CSO Online',
    url: 'https://www.csoonline.com',
    feed_url: 'https://www.csoonline.com/feed/',
    source_type: 'rss',
    credibility_score: 0.80,
  },
  {
    name: 'BankInfoSecurity',
    url: 'https://www.bankinfosecurity.com',
    feed_url: 'https://www.bankinfosecurity.com/rss',
    source_type: 'rss',
    credibility_score: 0.82,
  },
];
