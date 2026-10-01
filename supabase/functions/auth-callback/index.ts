/**
 * Redirects auth callbacks to the static page hosted on our domain.
 *
 * Supabase edge functions enforce `content-type: text/plain` and a strict CSP
 * sandbox, so they cannot serve rendered HTML. Instead we 302 to callback.html
 * which handles both email confirmation and password recovery.
 *
 * URL fragments (#access_token=...&type=recovery) are preserved across 302
 * redirects by all browsers — the browser re-appends the original fragment to
 * the new URL automatically.
 */
const CALLBACK_PAGE = 'https://pitchgym.anyabedrytska.com/auth/callback.html';

Deno.serve(() => {
  return new Response(null, {
    status: 302,
    headers: { location: CALLBACK_PAGE },
  });
});
