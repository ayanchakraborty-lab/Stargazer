/**
 * sentence-checker-worker.js
 * ────────────────────────────────────────────────────────────────
 * Cloudflare Worker that powers the "Satzbauer" AI sentence checker
 * in GERMAN.html. Deploy this the same way you deployed your R2
 * vault worker, then set AI_CHECK_ENDPOINT in GERMAN.html to this
 * worker's URL (e.g. https://german-sentence-checker.<you>.workers.dev).
 *
 * WHY A WORKER AND NOT A DIRECT FETCH FROM THE BROWSER?
 * Anthropic's API key must never be shipped in client-side JS — anyone
 * could open devtools, steal it, and run up your bill. This worker
 * holds the key as a secret on Cloudflare's servers and the browser
 * only ever talks to the worker, never directly to api.anthropic.com.
 *
 * SETUP
 *   1. wrangler login                         (if not already)
 *   2. wrangler secret put ANTHROPIC_API_KEY   (paste your key when prompted)
 *   3. wrangler deploy                          (uses wrangler.toml below)
 *   4. Copy the printed *.workers.dev URL into GERMAN.html's
 *      AI_CHECK_ENDPOINT constant.
 *
 * Companion wrangler.toml:
 * ---------------------------------------------------------
 * name = "german-sentence-checker"
 * main = "sentence-checker-worker.js"
 * compatibility_date = "2024-01-01"
 * ---------------------------------------------------------
 */

const ALLOWED_ORIGINS = [
  'https://stargazer-9m9.pages.dev',
  // Add your custom domain here once you have one, e.g.:
  // 'https://your-domain.com',
];

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

const SYSTEM_PROMPT = `You are a strict but encouraging German grammar tutor. You will be given a target German word and a sentence a learner wrote using that word. Analyze the sentence and respond with ONLY raw JSON (no markdown fences, no preamble) matching exactly this shape:

{
  "usesWord": boolean,            // does the sentence actually use the target word (or a correctly inflected form of it)?
  "errors": [                     // empty array if no grammar errors
    {
      "issue": "short label, e.g. 'Falsche Wortstellung (V2-Regel)'",
      "explanation": "1-3 sentences in German explaining what's wrong AND which specific grammar rule applies (case, verb position, adjective ending, etc). Be precise and pedagogical."
    }
  ],
  "praise": "if errors is empty, 1-2 encouraging sentences in German about what the learner did well",
  "suggestion": "an improved, more natural/idiomatic version of the sentence in German — fix any errors AND elevate the style/tone if the original was flat or overly simple",
  "toneNote": "1-2 sentences in German (or English if more useful) explaining what changed about TONE or SENTENCE CONSTRUCTION between the original and your suggestion — e.g. moving from simple present to a more sophisticated structure, better word order, more natural collocations"
}

Rules:
- If the sentence does not contain the target word in any correctly inflected form, set usesWord to false and omit other analysis.
- Be specific about WHICH grammar rule is violated (case government, verb-second position, adjective declension, separable verb placement, subjunctive mood, etc) — this is for an advanced learner who wants to understand the underlying system, not just be told "this is wrong."
- Always provide a "suggestion" even when there are no hard errors, if the sentence could be more sophisticated, idiomatic, or better toned.
- Respond with ONLY the JSON object. No markdown code fences. No extra text.`;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405, headers: corsHeaders(origin),
      });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: corsHeaders(origin),
      });
    }

    const { word, sentence } = body || {};
    if (!word || !sentence || typeof sentence !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing word or sentence' }), {
        status: 400, headers: corsHeaders(origin),
      });
    }
    if (sentence.length > 500) {
      return new Response(JSON.stringify({ error: 'Sentence too long' }), {
        status: 400, headers: corsHeaders(origin),
      });
    }

    try {
      const apiResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: `Zielwort: "${word}"\nSatz des Lernenden: "${sentence}"`,
            },
          ],
        }),
      });

      if (!apiResp.ok) {
        const errText = await apiResp.text();
        console.error('Anthropic API error:', apiResp.status, errText);
        return new Response(JSON.stringify({ error: 'AI service error' }), {
          status: 502, headers: corsHeaders(origin),
        });
      }

      const data = await apiResp.json();
      const textBlock = (data.content || []).find(b => b.type === 'text');
      if (!textBlock) {
        return new Response(JSON.stringify({ error: 'No response from AI' }), {
          status: 502, headers: corsHeaders(origin),
        });
      }

      const cleaned = textBlock.text.replace(/```json|```/g, '').trim();
      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch (e) {
        console.error('Failed to parse AI JSON:', cleaned);
        return new Response(JSON.stringify({ error: 'Could not parse AI response' }), {
          status: 502, headers: corsHeaders(origin),
        });
      }

      return new Response(JSON.stringify(parsed), { headers: corsHeaders(origin) });
    } catch (e) {
      console.error('Worker error:', e);
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500, headers: corsHeaders(origin),
      });
    }
  },
};
