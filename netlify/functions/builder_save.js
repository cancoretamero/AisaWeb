// netlify/functions/builder_save.js
export const handler = async (event) => {
  try {
    const requiredToken = process.env.AISA_ADMIN_TOKEN || "";
    const incoming = event.headers["x-aisa-admin-token"] || event.headers["X-AISA-ADMIN-TOKEN"] || "";
    if (requiredToken && incoming !== requiredToken) {
      return { statusCode: 401, body: "Unauthorized" };
    }

    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";
    const token = process.env.GITHUB_TOKEN;
    const path = "content/builder/state.json";

    if (!repo || !token) {
      return { statusCode: 500, body: "Missing env vars (GITHUB_REPO/GITHUB_TOKEN)" };
    }

    const payload = JSON.parse(event.body || "{}");
    const state = payload.state;
    if (!state || typeof state !== "object") {
      return { statusCode: 400, body: "Bad Request: missing state" };
    }

    const getUrl = `https://api.github.com/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`;
    const currentRes = await fetch(getUrl, {
      headers: { "Authorization": `token ${token}`, "Accept": "application/vnd.github+json" }
    });

    let sha = null;
    if (currentRes.ok) {
      const current = await currentRes.json();
      sha = current.sha;
    }

    const putUrl = `https://api.github.com/repos/${repo}/contents/${path}`;
    const content = Buffer.from(JSON.stringify(state, null, 2), "utf-8").toString("base64");

    const putBody = {
      message: `builder: update ${path}`,
      content,
      branch,
      ...(sha ? { sha } : {})
    };

    const putRes = await fetch(putUrl, {
      method: "PUT",
      headers: { "Authorization": `token ${token}`, "Accept": "application/vnd.github+json" },
      body: JSON.stringify(putBody)
    });

    const putText = await putRes.text().catch(() => "");
    if (!putRes.ok) {
      return { statusCode: putRes.status, body: `GitHub put failed: ${putText}` };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ ok: true })
    };
  } catch (e) {
    return { statusCode: 500, body: String(e?.message || e) };
  }
};
