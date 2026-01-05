// netlify/functions/content.js
//
// Guarda data/content.json en el repo vía GitHub REST API (gratis).
//
// Requiere env vars en Netlify (Site settings -> Environment variables):
//   - GITHUB_TOKEN            (PAT con permisos de "Contents: Read and write" en el repo)
//   - GITHUB_REPO             (default: "cancoretamero/AisaWeb")
//   - GITHUB_BRANCH           (default: "main")
//   - GITHUB_CONTENT_PATH     (default: "data/content.json")
//
// Hardening opcional:
//   - AISA_CONSOLE_TOKEN      (si se define, la consola debe enviar header x-aisa-console-token)
//   - CONSOLE_ALLOWED_ORIGIN  (si se define, valida Origin/Referer)
//
// Request:
//   POST /.netlify/functions/content
//   Body JSON: { "content": { ... el JSON completo ... } }
//
// Response:
//   { ok:true, changed:true|false, commitSha, fileSha }

const json = (statusCode, payload, extraHeaders = {}) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders,
  },
  body: JSON.stringify(payload),
});

function safeJsonParse(str) {
  try {
    return { ok: true, value: JSON.parse(str) };
  } catch (e) {
    return { ok: false, error: e };
  }
}

function normalizePath(p) {
  // Keep slashes but encode other characters safely for GitHub API
  return encodeURIComponent(p).replace(/%2F/g, "/");
}

function isObject(x) {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function stableStringify(obj) {
  // JSON stable enough (keys order depends on insertion but we generate with our structure)
  return JSON.stringify(obj, null, 2) + "\n";
}

async function githubRequest(url, token, { method = "GET", body } = {}) {
  const headers = {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text().catch(() => "");
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* ignore */ }

  return { ok: res.ok, status: res.status, data, text };
}

exports.handler = async (event) => {
  try {
    // CORS preflight (por si en algún momento llamas desde otro origin)
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
          "Access-Control-Allow-Headers": "Content-Type, x-aisa-console-token",
          "Access-Control-Max-Age": "86400",
          "Cache-Control": "no-store",
        },
        body: "",
      };
    }

    if (event.httpMethod !== "POST") {
      return json(405, { ok: false, error: "Method Not Allowed" }, { Allow: "POST, OPTIONS" });
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return json(500, {
        ok: false,
        error: "Missing GITHUB_TOKEN env var",
        hint: "Set GITHUB_TOKEN in Netlify env vars (PAT with Contents RW).",
      });
    }

    // Optional origin guard
    const allowedOrigin = process.env.CONSOLE_ALLOWED_ORIGIN;
    if (allowedOrigin) {
      const origin = event.headers.origin || event.headers.Origin || "";
      const referer = event.headers.referer || event.headers.Referer || "";
      const ok =
        origin === allowedOrigin ||
        (typeof referer === "string" && referer.startsWith(allowedOrigin));

      if (!ok) {
        return json(403, { ok: false, error: "Forbidden", detail: "Origin/Referer not allowed" });
      }
    }

    // Optional shared secret guard
    const requiredSecret = process.env.AISA_CONSOLE_TOKEN;
    if (requiredSecret) {
      const provided = event.headers["x-aisa-console-token"] || event.headers["X-Aisa-Console-Token"];
      if (!provided || provided !== requiredSecret) {
        return json(403, { ok: false, error: "Forbidden", detail: "Missing/invalid console token" });
      }
    }

    if (!event.body) {
      return json(400, { ok: false, error: "Missing request body" });
    }

    const parsed = safeJsonParse(event.body);
    if (!parsed.ok) {
      return json(400, { ok: false, error: "Invalid JSON body" });
    }

    const body = parsed.value;
    if (!isObject(body) || !isObject(body.content)) {
      return json(400, { ok: false, error: "Body must be { content: {...} }" });
    }

    const content = body.content;

    // Minimal validation for safety
    if (!isObject(content.pages)) {
      return json(400, { ok: false, error: "content.pages must be an object" });
    }

    // Ensure schemaVersion and updatedAt exist
    if (typeof content.schemaVersion !== "number") content.schemaVersion = 1;
    content.updatedAt = new Date().toISOString();

    const repoFull = process.env.GITHUB_REPO || "cancoretamero/AisaWeb";
    const branch = process.env.GITHUB_BRANCH || "main";
    const filePath = process.env.GITHUB_CONTENT_PATH || "data/content.json";

    const [owner, repo] = repoFull.split("/");
    if (!owner || !repo) {
      return json(500, { ok: false, error: "Invalid GITHUB_REPO format. Expected owner/repo." });
    }

    const apiBase = `https://api.github.com/repos/${owner}/${repo}/contents/${normalizePath(filePath)}`;
    const getUrl = `${apiBase}?ref=${encodeURIComponent(branch)}`;

    // 1) Get current file (to obtain sha and avoid no-op commits)
    const current = await githubRequest(getUrl, token, { method: "GET" });

    let currentSha = null;
    let currentText = null;

    if (current.ok && current.data && current.data.sha) {
      currentSha = current.data.sha;
      if (current.data.content && current.data.encoding === "base64") {
        const buf = Buffer.from(current.data.content, "base64");
        currentText = buf.toString("utf-8");
      }
    } else if (current.status !== 404) {
      // unexpected error
      return json(502, {
        ok: false,
        error: "GitHub read failed",
        status: current.status,
        detail: current.data?.message || current.text?.slice(0, 200) || "unknown",
      });
    }

    const newText = stableStringify(content);

    // No-op commit avoidance
    if (currentText !== null && currentText === newText) {
      return json(200, { ok: true, changed: false, fileSha: currentSha });
    }

    const newB64 = Buffer.from(newText, "utf-8").toString("base64");

    // 2) PUT update
    const message =
      body.commitMessage ||
      `chore(content): update ${filePath} via AISA Console`;

    const putBody = {
      message,
      content: newB64,
      branch,
      ...(currentSha ? { sha: currentSha } : {}),
    };

    const updated = await githubRequest(apiBase, token, { method: "PUT", body: putBody });

    if (!updated.ok) {
      return json(502, {
        ok: false,
        error: "GitHub write failed",
        status: updated.status,
        detail: updated.data?.message || updated.text?.slice(0, 300) || "unknown",
      });
    }

    const commitSha = updated.data?.commit?.sha || null;
    const fileSha = updated.data?.content?.sha || null;

    return json(200, { ok: true, changed: true, commitSha, fileSha });
  } catch (err) {
    return json(500, { ok: false, error: "Unexpected error", detail: err?.message || String(err) });
  }
};
