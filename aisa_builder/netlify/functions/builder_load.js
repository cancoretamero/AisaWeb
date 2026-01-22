// netlify/functions/builder_load.js
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

    const url = `https://api.github.com/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`;
    const res = await fetch(url, {
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github+json"
      }
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { statusCode: res.status, body: `GitHub fetch failed: ${t}` };
    }

    const json = await res.json();
    const content = Buffer.from(json.content, "base64").toString("utf-8");
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: content
    };
  } catch (e) {
    return { statusCode: 500, body: String(e?.message || e) };
  }
};
