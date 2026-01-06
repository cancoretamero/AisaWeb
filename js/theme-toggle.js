/* js/theme-toggle.js
   Control global dark/light.
   - Persiste preferencia en localStorage ("theme" => "dark" | "light")
   - Si no hay preferencia, usa el modo del sistema
   - Inyecta el botón flotante si una página no lo incluye
*/

(() => {
  const STORAGE_KEY = "theme";

  function safeGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignorar (modo privado / storage bloqueado)
    }
  }

  function systemPrefersDark() {
    try {
      return !!window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  }

  function getInitialTheme() {
    const stored = safeGet(STORAGE_KEY);
    if (stored === "dark" || stored === "light") return stored;
    return systemPrefersDark() ? "dark" : "light";
  }

  function applyTheme(theme) {
    const html = document.documentElement;
    if (theme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }

  function toggleTheme() {
    const html = document.documentElement;
    const next = html.classList.contains("dark") ? "light" : "dark";
    applyTheme(next);
    safeSet(STORAGE_KEY, next);
  }

  // Aplica ASAP (por si alguna página no trae el pre-init inline)
  applyTheme(getInitialTheme());

  function ensureToggleButton() {
    let btn = document.getElementById("theme-toggle");

    if (!btn) {
      btn = document.createElement("button");
      btn.id = "theme-toggle";
      btn.type = "button";
      btn.className =
        "fixed bottom-8 right-8 z-[100] w-12 h-12 rounded-full glass-apple flex items-center justify-center text-lg text-accent-gold hover:scale-110 transition-transform cursor-pointer shadow-lg";

      btn.setAttribute("aria-label", "Cambiar modo claro/oscuro");
      btn.innerHTML =
        '<i class="fa-solid fa-moon dark:hidden"></i>' +
        '<i class="fa-solid fa-sun hidden dark:block"></i>';

      document.body.appendChild(btn);
    } else {
      // Asegura iconos si el botón existe pero está vacío o distinto
      const hasMoon = btn.querySelector(".fa-moon") || btn.querySelector(".fa-solid.fa-moon");
      const hasSun = btn.querySelector(".fa-sun") || btn.querySelector(".fa-solid.fa-sun");
      if (!hasMoon && !hasSun) {
        btn.innerHTML =
          '<i class="fa-solid fa-moon dark:hidden"></i>' +
          '<i class="fa-solid fa-sun hidden dark:block"></i>';
      }

      if (!btn.getAttribute("aria-label")) {
        btn.setAttribute("aria-label", "Cambiar modo claro/oscuro");
      }
    }

    // Evita doble binding si hay hot reload o scripts duplicados
    if (btn.dataset.aisaThemeBound === "true") return;

    btn.addEventListener("click", toggleTheme);
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleTheme();
      }
    });

    btn.dataset.aisaThemeBound = "true";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureToggleButton, { once: true });
  } else {
    ensureToggleButton();
  }
})();
