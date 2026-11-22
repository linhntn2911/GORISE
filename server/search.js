const trustedDomains = [
  'unicef.org', 'who.int', 'unesco.org', 'apa.org', 'britannica.com',
  'nature.com', 'frontiersin.org', 'sciencedirect.com', 'springer.com',
  'harvard.edu', 'stanford.edu', 'cambridge.org', 'ox.ac.uk',
  'uwaterloo.ca', 'scholastic.com', 'ejmste.com',
  'bbc.com', 'reuters.com', 'apnews.com', 'vnexpress.net', 'tuoitre.vn',
];
const blockedDomains = ['facebook.com', 'tiktok.com', 'instagram.com', 'pinterest.com', 'quora.com'];

function safeUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    if (!url.hostname.includes('.') || /^\d+(\.\d+){3}$/.test(url.hostname)) return null;
    url.hash = '';
    return url;
  } catch { return null; }
}

function domainMatches(host, domain) {
  return host === domain || host.endsWith(`.${domain}`);
}

export function filterSources(results, fresh = false) {
  const seen = new Set();
  return (Array.isArray(results) ? results : [])
    .map((result) => {
      const url = safeUrl(result?.url);
      if (!url || typeof result.content !== 'string' || result.content.trim().length < 60) return null;
      const host = url.hostname.toLowerCase().replace(/^www\./, '');
      if (blockedDomains.some((domain) => domainMatches(host, domain))) return null;
      const score = Number(result.score || 0);
      const trusted = host.endsWith('.gov') || host.endsWith('.gov.vn') || host.endsWith('.edu') || host.endsWith('.edu.vn') || host.endsWith('.ac.uk') || host.endsWith('.ac.vn') ||
        trustedDomains.some((domain) => domainMatches(host, domain));
      if (!trusted || score < 0.4) return null;
      const publishedTime = result.published_date ? Date.parse(result.published_date) : NaN;
      if (fresh && Number.isFinite(publishedTime) && Date.now() - publishedTime > 3 * 365 * 86400000) return null;
      if (seen.has(host)) return null;
      seen.add(host);
      return {
        title: String(result.title || host).slice(0, 80),
        label: host,
        url: url.toString(),
        excerpt: result.content.replace(/\s+/g, ' ').trim().slice(0, 850),
        trust: trusted ? 2 : 1,
        score,
        publishedDate: result.published_date || null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.trust - a.trust || b.score - a.score)
    .slice(0, 5);
}

export async function searchWeb(query) {
  if (!process.env.TAVILY_API_KEY) return { available: false, error: 'unconfigured', sources: [] };
  try {
    const plain = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const fresh = /hien nay|moi nhat|xu huong|2026/.test(plain);
    const researchQuery = /board game|tro choi giao duc/.test(plain) && /loi ich|tac dung|phat trien/.test(plain)
      ? 'educational board games benefits for children learning development research'
      : query;
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: researchQuery.slice(0, 350),
        search_depth: 'basic',
        max_results: 8,
        include_answer: false,
        include_raw_content: false,
        include_images: false,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Search service returned ${response.status}`);
    const data = await response.json();
    const sources = filterSources(data.results, fresh);
    return { available: true, error: sources.length ? null : 'no_trusted_results', sources };
  } catch (error) {
    console.error('Web search unavailable:', error.message);
    return { available: false, error: 'provider_error', sources: [] };
  }
}
