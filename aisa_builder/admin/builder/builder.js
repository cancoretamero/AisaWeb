// admin/builder/builder.js
// Conecta tu builder (Gemini) con Netlify Functions para leer/guardar en GitHub.
// Mantiene fallback a localStorage si no hay backend.

(function () {
  const API_LOAD = "/.netlify/functions/builder_load";
  const API_SAVE = "/.netlify/functions/builder_save";

  function getAdminToken() {
    try {
      const cached = localStorage.getItem("aisa_admin_token");
      if (cached) return cached;
      const t = prompt("Token de Admin (AISA_ADMIN_TOKEN):");
      if (t) localStorage.setItem("aisa_admin_token", t);
      return t || "";
    } catch {
      return "";
    }
  }

  async function loadFromRepo() {
    const token = getAdminToken();
    const res = await fetch(API_LOAD, {
      method: "GET",
      headers: token ? { "x-aisa-admin-token": token } : {},
    });
    if (!res.ok) throw new Error("builder_load failed: " + res.status);
    return await res.json();
  }

  async function saveToRepo(state) {
    const token = getAdminToken();
    const res = await fetch(API_SAVE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "x-aisa-admin-token": token } : {}),
      },
      body: JSON.stringify({ state }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`builder_save failed: ${res.status} ${txt}`);
    }
    return await res.json();
  }

  const waitForGlobals = setInterval(() => {
    if (typeof window.loadState === "function" && typeof window.saveState === "function" && window.state) {
      clearInterval(waitForGlobals);

      const originalLoadState = window.loadState;
      const originalSaveState = window.saveState;

      window.loadState = async () => {
        try {
          const data = await loadFromRepo();
          window.state = data;
          localStorage.setItem("aisa_builder_last_repo_state", JSON.stringify(data));
          if (window.state?.pages?.length && !window.currentPageId) {
            window.currentPageId = window.state.pages[0].id;
          }
        } catch {
          try {
            const cached = localStorage.getItem("aisa_builder_last_repo_state");
            if (cached) window.state = JSON.parse(cached);
          } catch {}
          originalLoadState();
        }
      };

      window.saveState = () => {
        try {
          originalSaveState();
        } catch {}
        saveToRepo(window.state)
          .then(() => console.log("Saved to repo OK"))
          .catch((err) => {
            console.warn("Save to repo failed, kept local:", err);
            alert("No se pudo guardar en GitHub (se guardó local). Revisa token/Netlify Functions.");
          });
      };

      (async () => {
        await window.loadState();
        try { window.renderCanvas(); } catch {}
        try { window.renderInspector(); } catch {}
        try { window.renderPageList?.(); } catch {}
      })();
    }
  }, 120);
})();
