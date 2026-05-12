/**
 * Maho Storefront — /robots.txt generator
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Storefront-owned robots.txt with Content Signals (per the IETF draft
 * popularised by Cloudflare's agent-readiness initiative) and AI-bot
 * rules tuned for "agent ready" rather than the default Cloudflare
 * managed posture of blocking every AI bot.
 *
 * Posture:
 *  - search=yes       — let search engines index normally
 *  - ai-train=no      — don't train models on our content
 *  - ai-input=yes     — let agents read our content at inference time
 *                       when invoked by a user (RAG, agent shopping)
 *
 * Per-bot rules: Allow legit AI agents (ClaudeBot, GPTBot, Google-Extended,
 * PerplexityBot, etc.) to crawl. Keep the Disallow for known training-only
 * scrapers (CCBot, meta-externalagent) since ai-train=no covers them and
 * an explicit Disallow is a clearer signal.
 */

interface RobotsTxtInput {
  origin: string;
}

export function generateRobotsTxt({ origin }: RobotsTxtInput): string {
  return [
    '# Content Signals — IETF draft, see https://www.rfc-editor.org/draft-ietf-aicontrol-content-signals/',
    '# Grants/restrictions per use-case. ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE',
    '# EXPRESS RESERVATIONS OF RIGHTS UNDER ARTICLE 4 OF THE EUROPEAN UNION DIRECTIVE',
    '# 2019/790 ON COPYRIGHT AND RELATED RIGHTS IN THE DIGITAL SINGLE MARKET.',
    '',
    '# search:   building a search index (returning hyperlinks and short excerpts)',
    '# ai-input: real-time use as input to AI models (RAG, agent grounding, search summaries)',
    '# ai-train: training or fine-tuning AI models',
    '',
    'User-agent: *',
    'Content-Signal: search=yes, ai-input=yes, ai-train=no',
    'Allow: /',
    'Disallow: /checkout/',
    'Disallow: /account/',
    'Disallow: /cart/',
    'Disallow: /dev/',
    'Disallow: /sync/',
    'Disallow: /cache/',
    'Disallow: /admin',
    '',
    '# Training-only scrapers — no inference, no answer-engine, just bulk training.',
    '# ai-train=no above applies to everyone; the explicit Disallow makes it unambiguous.',
    'User-agent: CCBot',
    'Disallow: /',
    '',
    'User-agent: meta-externalagent',
    'Disallow: /',
    '',
    '# Sitemap + agent reading list',
    `Sitemap: ${origin}/sitemap.xml`,
    `# llms.txt: ${origin}/llms.txt`,
    '',
  ].join('\n');
}
