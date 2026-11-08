// Cloudflare Pages Function for LIBRARY.html. Single file: put it at  functions/library-file.js  in your site folder.
// URL pattern: /library-file?k=<file key>   (add &dl=1 to force a download)
// Needs: R2 binding named LIBRARY_BUCKET, and env vars SUPABASE_URL, SUPABASE_KEY (publishable key).
const ADMINS = ['ayanchakrabortyall@gmail.com','officialayanimp@gmail.com','duolingo.learn1024@gmail.com'];
async function isAdmin(request, env) {
  const tok = (request.headers.get('Authorization') || '').replace('Bearer ', '');
  if (!tok) return false;
  const r = await fetch(env.SUPABASE_URL + '/auth/v1/user', { headers: { Authorization: 'Bearer ' + tok, apikey: env.SUPABASE_KEY } });
  if (!r.ok) return false;
  const u = await r.json();
  return ADMINS.includes((u.email || '').toLowerCase());
}
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const key = url.searchParams.get('k') || '';
  if (!key) return new Response('Missing file key', { status: 400 });
  const m = request.method;
  if (m === 'PUT' || m === 'DELETE') {
    if (!(await isAdmin(request, env))) return new Response('Forbidden', { status: 403 });
    if (m === 'DELETE') { await env.LIBRARY_BUCKET.delete(key); return new Response('deleted'); }
    await env.LIBRARY_BUCKET.put(key, request.body, { httpMetadata: { contentType: request.headers.get('Content-Type') || 'application/octet-stream' } });
    return new Response('ok');
  }
  if (m !== 'GET' && m !== 'HEAD') return new Response('Method not allowed', { status: 405 });
  const o = await env.LIBRARY_BUCKET.get(key);
  if (!o) return new Response('Not found', { status: 404 });
  const h = new Headers();
  o.writeHttpMetadata(h);
  h.set('etag', o.httpEtag);
  const nice = key.split('_').slice(2).join('_') || key;
  h.set('Content-Disposition', (url.searchParams.has('dl') ? 'attachment' : 'inline') + '; filename="' + nice.replace(/"/g, '') + '"');
  return new Response(m === 'HEAD' ? null : o.body, { headers: h });
}
