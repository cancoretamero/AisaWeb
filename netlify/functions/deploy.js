// netlify/functions/deploy.js
//
// Netlify Function (Node) to trigger a Netlify Build Hook server-side.
// Why: We never expose the Build Hook URL to the browser.
//
// Required env var (Netlify UI -> Site settings -> Environment variables):
//   - NETLIFY_BUILD_HOOK_URL = https://api.netlify.com/build_hooks/xxxx
//
// Optional hardening env var:
//   - CONSOLE_ALLOWED_ORIGIN = https://aisaweb.netlify.app   (your production origin)
//     If set, requests must come from that origin (checked via Origin/Referer).

const json = (statusCode, payload, extraHeaders = {}) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders,
  },
  body: JSON.stringify(payload),
});

exports.handler = async (event) => {
  try {
    // Handle CORS preflight defensively (useful during local dev or if you later add headers)
    if (event.httpMethod === "OPTIONS") {
      const allowOrigin =
        process.env.CONSOLE_ALLOWED_ORIGIN ||
        event.headers.origin ||
        event.headers.Origin ||
        "*";

      return {
        statusCode: 204,
        headers: {
          "Access-Control-Allow-Origin": allowOrigin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
          "Cache-Control": "no-store",
        },
        body: "",
      };
    }

    if (event.httpMethod !== "POST") {
      return json(405, { ok: false, error: "Method Not Allowed" }, { Allow: "POST, OPTIONS" });
    }

    const buildHookUrl = process.env.NETLIFY_BUILD_HOOK_URL;
    if (!buildHookUrl) {
      return json(500, {
        ok: false,
        error: "Missing NETLIFY_BUILD_HOOK_URL env var",
        hint: "Set it in Netlify: Site settings -> Environment variables",
      });
    }

    // Optional origin guard (helps reduce random external triggering)
    const allowedOrigin = process.env.CONSOLE_ALLOWED_ORIGIN;
    if (allowedOrigin) {
      const origin = event.headers.origin || event.headers.Origin || "";
      const referer = event.headers.referer || event.headers.Referer || "";

      const ok =
        origin === allowedOrigin ||
        (typeof referer === "string" && referer.startsWith(allowedOrigin));

      if (!ok) {
        return json(403, {
          ok: false,
          error: "Forbidden",
          detail: "Origin/Referer not allowed",
        });
      }
    }

    // Trigger Netlify build hook
    const resp = await fetch(buildHookUrl, { method: "POST" });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return json(502, {
        ok: false,
        error: "Build hook request failed",
        status: resp.status,
        response: text.slice(0, 500),
      });
    }

    return json(200, { ok: true });
  } catch (err) {
    return json(500, {
      ok: false,
      error: "Unexpected error",
      detail: err?.message || String(err),
    });
  }
};
