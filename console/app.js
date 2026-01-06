// console/app.js
// AISA Liquid Command Center — Console MVP (sin CMS todavía)
// - Navegación de vistas (Dashboard / Editor / etc.)
// - Editor: páginas + layout + selección + propiedades
// - Guardar (AHORA: local + commit de /data/content.json vía Netlify Function)
// - Publicar (REAL): commit (si hay cambios) + llama a /.netlify/functions/deploy
//
// Importante: NO elimina funcionalidades. Amplía el app existente con persistencia.

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const ENDPOINT_DEPLOY = "/.netlify/functions/deploy";

  // Persistencia FREE (GitHub) ya disponible en tu repo:
  // netlify/functions/content.js (POST { content: {...} })
  const ENDPOINT_CONTENT = "/.netlify/functions/content";
  const CONTENT_URL = "/data/content.json";

  // Si activas AISA_CONSOLE_TOKEN en Netlify, la consola enviará este token
  // (lo pedirá con el modal-auth cuando reciba 403).
  const TOKEN_STORAGE_KEY = "aisa.console.token";

  // Resolver del modal de token
  let tokenResolver = null;

  const state = {
    view: "dashboard",
    pages: [],
    activePageId: null,
    layout: [],
    selectedBlockId: null,

    // dirty: hay cambios en la vista actual (layout) que no están persistidos
    dirty: false,

    // needsCommit: el contenido en memoria todavía NO está comiteado a /data/content.json
    needsCommit: false,

    // Content loaded from /data/content.json
    contentJson: null,
    contentLoaded: false,
  };

  // ---------------------------
  // Utils
  // ---------------------------
  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[c]));

  function setSrStatus(msg) {
    const el = $("#sr-status");
    if (el) el.textContent = msg;
  }

  /**
   * En algunos entornos el target puede ser un TextNode (nodeType===3).
   * Esta función normaliza el target para poder usar closest() sin romper.
   */
  function getActionElementFromEvent(e) {
    const raw = e?.target;
    const node = raw && raw.nodeType === 1 ? raw : raw?.parentElement; // 1 = ELEMENT_NODE
    if (!node || typeof node.closest !== "function") return null;
    return node.closest("[data-action]");
  }

  // ---------------------------
  // Status indicator (topbar) — reutiliza cmsLabel/cmsDot/cmsPing
  // ---------------------------
  function setIndicator(labelText, mode = "warn") {
    const label = $("#cmsLabel");
    const dot = $("#cmsDot");
    const ping = $("#cmsPing");

    if (label) label.textContent = labelText;

    if (!dot || !ping) return;

    if (mode === "ok") {
      dot.className = "relative w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_#10B981]";
      ping.className = "absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-40";
      return;
    }

    if (mode === "error") {
      dot.className = "relative w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_#EF4444]";
      ping.className = "absolute inset-0 bg-red-500 rounded-full animate-ping opacity-40";
      return;
    }

    // warn
    dot.className = "relative w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_10px_#FACC15]";
    ping.className = "absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-40";
  }

  function getStoredToken() {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY) || "";
  }

  function setStoredToken(token) {
    if (token) sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  }

  // ---------------------------
  // Toast
  // ---------------------------
  function toast({ title = "OK", message = "", tone = "info", ms = 2600 } = {}) {
    const root = $("#toast-root");
    if (!root) return;

    const dotClass =
      tone === "error"
        ? "bg-red-500"
        : tone === "warn"
          ? "bg-yellow-400"
          : "bg-emerald-400";

    const borderClass =
      tone === "error"
        ? "border-red-500/30"
        : tone === "warn"
          ? "border-yellow-500/30"
          : "border-white/10";

    const el = document.createElement("div");
    el.className = `pointer-events-auto glass-panel-pro rounded-2xl px-4 py-3 border ${borderClass}`;

    el.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="mt-0.5 w-2.5 h-2.5 rounded-full ${dotClass} shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
        <div class="flex-1 min-w-0">
          <div class="text-xs font-bold text-white uppercase tracking-widest">${escapeHtml(title)}</div>
          ${message ? `<div class="text-xs text-gray-400 mt-1 leading-snug">${escapeHtml(message)}</div>` : ""}
        </div>
        <button class="text-gray-500 hover:text-white transition-colors" aria-label="Cerrar">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `;

    el.querySelector("button").addEventListener("click", () => el.remove());
    root.appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  // ---------------------------
  // Modal helpers
  // ---------------------------
  function openModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.remove("hidden");
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.add("hidden");
  }

  function closeAllModals() {
    // Si hay un token prompt pendiente, se cancela
    if (tokenResolver) {
      tokenResolver("");
      tokenResolver = null;
    }
    ["modal-auth", "modal-publish"].forEach(closeModal);
  }

  // Reutilizamos modal-auth para pedir token si hay AISA_CONSOLE_TOKEN configurado
  function requestConsoleToken() {
    return new Promise((resolve) => {
      tokenResolver = resolve;

      // Ajusta copy del modal para “Token”
      const title = $("#authTitle");
      if (title) title.textContent = "Autorización de consola";

      // Oculta el campo email si existe (opcional)
      const email = $("#authEmail");
      if (email && email.parentElement) {
        email.parentElement.style.display = "none";
      }

      const pass = $("#authPassword");
      if (pass) {
        pass.value = "";
        pass.placeholder = "Token de consola";
      }

      openModal("modal-auth");
      if (pass) pass.focus();
    });
  }

  function wireAuthModal() {
    const form = $("#authForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const pass = $("#authPassword");
      const token = pass ? String(pass.value || "").trim() : "";
      if (!token) {
        toast({ title: "Token", message: "Introduce el token para continuar.", tone: "warn" });
        return;
      }

      setStoredToken(token);
      closeModal("modal-auth");

      toast({ title: "Token OK", message: "Token guardado para esta sesión." });

      if (tokenResolver) {
        tokenResolver(token);
        tokenResolver = null;
      }
    });
  }

  // ---------------------------
  // Views
  // ---------------------------
  function showView(viewName) {
    state.view = viewName;

    const views = $$("[data-view]");
    views.forEach((v) => {
      const active = v.dataset.view === viewName;
      v.classList.toggle("opacity-100", active);
      v.classList.toggle("opacity-0", !active);
      v.classList.toggle("pointer-events-none", !active);
      v.classList.toggle("translate-y-0", active);
      v.classList.toggle("translate-y-4", !active);
    });

    const navLinks = $$('[data-action="switch-view"]');
    navLinks.forEach((a) => {
      const isActive = a.dataset.view === viewName;

      if (isActive) {
        a.setAttribute("aria-current", "page");
        a.className =
          "group flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium text-black bg-accent-gold shadow-[0_0_15px_rgba(250,204,21,0.3)] transition-all transform scale-[1.02]";

        if (!a.querySelector(".animate-pulse")) {
          const dot = document.createElement("div");
          dot.className = "ml-auto w-2 h-2 rounded-full bg-black animate-pulse";
          a.appendChild(dot);
        }
      } else {
        a.setAttribute("aria-current", "false");
        a.className =
          "group flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all";
        const dot = a.querySelector(".animate-pulse");
        if (dot) dot.remove();
      }
    });

    const crumb = $("#breadcrumbCurrent");
    if (crumb) {
      const map = {
        dashboard: "Dashboard",
        editor: "Editor",
        blog: "Blog & Prensa",
        media: "Media Assets",
        liveops: "Live Data Ops",
        audit: "Auditoría",
      };
      crumb.textContent = map[viewName] || viewName;
    }

    const pill = $("#pageStatusPill");
    if (pill) pill.classList.toggle("hidden", viewName !== "editor");
  }

  // ---------------------------
  // DEMO content model base (seguimos conservando cards/metrics etc.)
  // ---------------------------
  function demoPages() {
    const iso = new Date().toISOString();
    return [
      {
        id: "sostenibilidad",
        name: "Sostenibilidad",
        slug: "sostenibilidad",
        status: "draft",
        updatedAt: iso,
        layout: [
          {
            id: crypto.randomUUID(),
            type: "hero",
            props: {
              subtitle: "Nuestra Filosofía",
              title: "Declaración de<br>Sostenibilidad",
              desc:
                "En Aisa Group, la sostenibilidad es el núcleo de nuestra estrategia empresarial. Nos comprometemos a operar de manera responsable.",
              bgImage:
                "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=3870&auto=format&fit=crop",
            },
          },
          {
            id: crypto.randomUUID(),
            type: "metric",
            props: {
              icon: "fa-leaf",
              accent: "green",
              value: "60%",
              label: "Reducción Huella CO2",
            },
          },
          {
            id: crypto.randomUUID(),
            type: "metric",
            props: {
              icon: "fa-users",
              accent: "gold",
              value: "92%",
              label: "Empleo Local",
            },
          },
        ],
      },
      {
        id: "index",
        name: "Home (Index)",
        slug: "index",
        status: "draft",
        updatedAt: iso,
        layout: [
          {
            id: crypto.randomUUID(),
            type: "hero",
            props: {
              subtitle: "Liderando la transición",
              title: "De la tierra<br><span class='text-accent-gold'>al futuro.</span>",
              desc:
                "Un holding familiar transformando la minería tradicional en energía renovable y desarrollo sostenible.",
              bgImage:
                "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=3870&auto=format&fit=crop",
            },
          },
        ],
      },
    ];
  }

  // Block registry (MVP)
  const BLOCKS = {
    hero: {
      label: "Hero",
      category: "structural",
      icon: "fa-heading",
      defaults: {
        subtitle: "Nuevo bloque",
        title: "Título<br>Principal",
        desc: "Descripción del bloque…",
        bgImage:
          "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=3870&auto=format&fit=crop",
      },
      schema: [
        { key: "subtitle", label: "Subtítulo", type: "text" },
        { key: "title", label: "Título", type: "textarea" },
        { key: "desc", label: "Descripción", type: "textarea" },
        { key: "bgImage", label: "Background URL", type: "text" },
      ],
    },
    metric: {
      label: "Metric",
      category: "widgets",
      icon: "fa-chart-line",
      defaults: { value: "—", label: "Nueva métrica", icon: "fa-bolt", accent: "gold" },
      schema: [
        { key: "value", label: "Valor", type: "text" },
        { key: "label", label: "Etiqueta", type: "text" },
        { key: "icon", label: "Icono (FA)", type: "text" },
        { key: "accent", label: "Acento (gold/green/blue/purple/red)", type: "text" },
      ],
    },
  };

  // ---------------------------
  // Content.json <-> editor mapping (por ahora: HERO)
  // ---------------------------
  function applyContentToPages(content) {
    if (!content || typeof content !== "object" || !content.pages) return;

    state.pages.forEach((page) => {
      const hero = content.pages?.[page.slug]?.hero;
      if (!hero) return;

      const heroBlock = (page.layout || []).find((b) => b.type === "hero");
      if (!heroBlock) return;

      if (hero.bgImage) heroBlock.props.bgImage = hero.bgImage;
      heroBlock.props.subtitle = hero.tagline ?? ""; // null -> ""
      if (hero.titleHtml) heroBlock.props.title = hero.titleHtml;
      if (hero.descHtml) heroBlock.props.desc = hero.descHtml;

      // No tocamos métricas ni el resto de layout
    });
  }

  function buildContentFromPages(baseContent) {
    const out = baseContent && typeof baseContent === "object"
      ? JSON.parse(JSON.stringify(baseContent))
      : { schemaVersion: 1, pages: {} };

    if (typeof out.schemaVersion !== "number") out.schemaVersion = 1;
    if (!out.pages || typeof out.pages !== "object") out.pages = {};

    // Actualiza heroes desde el estado actual
    state.pages.forEach((page) => {
      const heroBlock = (page.layout || []).find((b) => b.type === "hero");
      if (!heroBlock) return;

      out.pages[page.slug] = out.pages[page.slug] || {};
      const tagline = String(heroBlock.props?.subtitle || "").trim();

      out.pages[page.slug].hero = {
        bgImage: heroBlock.props?.bgImage || "",
        tagline: tagline.length ? tagline : null,
        titleHtml: heroBlock.props?.title || "",
        descHtml: heroBlock.props?.desc || "",
      };
    });

    out.updatedAt = new Date().toISOString();
    return out;
  }

  // ---------------------------
  // UI binding: Page pills
  // ---------------------------
  function setPagePills(page) {
    $("#pageSlugPill").textContent = page ? page.slug : "—";
    $("#pageStatePill").textContent = page ? page.status : "—";
    $("#pageUpdatedAt").textContent = page ? new Date(page.updatedAt).toLocaleString() : "—";
  }

  function setPublishModalInfo(page) {
    $("#publishSlug").textContent = page ? page.slug : "—";
    $("#publishState").textContent = page ? page.status : "—";
  }

  // ---------------------------
  // Editor: active page selection
  // ---------------------------
  function getActivePage() {
    return state.pages.find((p) => p.id === state.activePageId) || null;
  }

  function setActivePage(pageId) {
    state.activePageId = pageId || null;
    const page = getActivePage();

    state.layout = page ? JSON.parse(JSON.stringify(page.layout || [])) : [];
    state.selectedBlockId = null;
    state.dirty = false;
    // no tocamos needsCommit aquí; es global y se limpia tras guardar

    setPagePills(page);
    renderCanvas();
    renderProperties(); // empty state
  }

  // ---------------------------
  // Canvas render
  // ---------------------------
  function accentToHex(accent) {
    const a = (accent || "gold").toLowerCase();
    if (a === "green") return "#10B981";
    if (a === "blue") return "#3B82F6";
    if (a === "purple") return "#8B5CF6";
    if (a === "red") return "#EF4444";
    return "#FACC15";
  }

  function renderCanvas() {
    const pageEl = $("#canvasPage");
    const empty = $("#canvasEmpty");
    if (!pageEl) return;

    const page = getActivePage();
    if (!page) {
      pageEl.innerHTML = "";
      if (empty) {
        empty.classList.remove("hidden");
        pageEl.appendChild(empty);
      }
      return;
    }

    if (empty) empty.classList.add("hidden");
    pageEl.innerHTML = "";

    // Render blocks
    state.layout.forEach((block) => {
      const wrapper = document.createElement("div");
      wrapper.className = "editable-block";
      wrapper.dataset.blockId = block.id;

      if (state.selectedBlockId === block.id) wrapper.classList.add("selected");

      if (block.type === "hero") {
        wrapper.classList.add(
          "group",
          "p-16",
          "text-center",
          "border-b",
          "border-white/5",
          "relative",
          "overflow-hidden"
        );

        const bg = block.props?.bgImage || "";
        const subtitle = String(block.props?.subtitle || "").trim();

        wrapper.innerHTML = `
          <div class="block-label"><i class="fa-solid fa-pen-nib mr-1"></i> HERO</div>
          <div class="absolute inset-0 bg-cover bg-center opacity-20" style="background-image:url('${bg}')"></div>
          <div class="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black"></div>

          <div class="relative z-10">
            ${subtitle ? `
              <span class="text-accent-gold text-xs font-bold uppercase tracking-[0.2em] mb-6 block">
                ${escapeHtml(subtitle)}
              </span>` : ""
            }
            <h1 class="font-display text-5xl md:text-7xl font-bold text-white mb-8 text-glow leading-tight">
              ${block.props?.title || ""}
            </h1>
            <p class="text-gray-300 text-xl font-light leading-relaxed max-w-3xl mx-auto">
              ${block.props?.desc || ""}
            </p>
          </div>

          <div class="absolute inset-0 border-2 border-accent-gold opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 rounded-lg"></div>
        `;
      } else if (block.type === "metric") {
        wrapper.classList.add("glass-panel-pro", "p-8", "rounded-[2rem]", "m-10");

        const icon = block.props?.icon || "fa-bolt";
        const hex = accentToHex(block.props?.accent);
        wrapper.innerHTML = `
          <div class="block-label">WIDGET</div>

          <div class="flex justify-between items-start mb-6">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center"
                 style="background:${hex}22;color:${hex};box-shadow:0 0 15px ${hex}22;">
              <i class="fa-solid ${icon} text-xl"></i>
            </div>
            <span class="text-[10px] font-mono text-gray-300 border border-white/10 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md">
              EDITABLE
            </span>
          </div>

          <h3 class="text-5xl font-display font-bold text-white mb-2">
            ${escapeHtml(block.props?.value || "—")}
          </h3>
          <p class="text-xs text-gray-400 uppercase tracking-widest font-bold">
            ${escapeHtml(block.props?.label || "")}
          </p>
        `;
      } else {
        wrapper.classList.add("m-10", "p-10", "rounded-[2rem]", "border", "border-white/10");
        wrapper.innerHTML = `<div class="block-label">${(block.type || "block").toUpperCase()}</div>`;
      }

      pageEl.appendChild(wrapper);
    });

    // Drop zone at end
    const drop = document.createElement("div");
    drop.id = "dropZone";
    drop.className =
      "mx-10 mb-10 h-32 border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center text-gray-600 hover:border-accent-gold/50 hover:text-accent-gold hover:bg-white/[0.02] transition-all cursor-pointer group";
    drop.innerHTML = `
      <div class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
        <i class="fa-solid fa-plus"></i>
      </div>
      <span class="text-xs uppercase tracking-widest font-bold">Arrastra aquí para añadir</span>
    `;
    pageEl.appendChild(drop);
  }

  // ---------------------------
  // Properties panel
  // ---------------------------
  function renderProperties() {
    const empty = $("#prop-empty");
    const active = $("#prop-active");
    const badge = $("#prop-type-badge");
    const body = $("#propBody");

    if (!empty || !active || !badge || !body) return;

    const selected = state.layout.find((b) => b.id === state.selectedBlockId);

    if (!selected) {
      empty.style.display = "flex";
      active.classList.add("hidden");
      return;
    }

    empty.style.display = "none";
    active.classList.remove("hidden");

    badge.textContent = (selected.type || "block").toUpperCase();

    const def = BLOCKS[selected.type];
    body.innerHTML = "";

    if (!def) {
      body.innerHTML = `<div class="text-xs text-gray-500 italic">Sin esquema para este bloque.</div>`;
      return;
    }

    const groupLabel = document.createElement("div");
    groupLabel.className = "space-y-4";
    groupLabel.innerHTML = `
      <label class="text-[10px] font-extrabold text-accent-gold uppercase tracking-widest flex items-center gap-2">
        <i class="fa-solid fa-pen"></i> Contenido
      </label>
    `;
    body.appendChild(groupLabel);

    def.schema.forEach((field) => {
      const wrap = document.createElement("div");
      wrap.className = "group";

      const lab = document.createElement("label");
      lab.className =
        "text-[10px] text-gray-400 mb-1.5 block uppercase font-bold group-focus-within:text-white transition-colors";
      lab.textContent = field.label;

      let input;
      const current = selected.props?.[field.key] ?? "";

      if (field.type === "textarea") {
        input = document.createElement("textarea");
        input.rows = 3;
        input.className =
          "w-full p-3 rounded-xl liquid-input text-xs leading-relaxed resize-none";
        input.value = String(current).replace(/<br\s*\/?>/g, "\n");
      } else {
        input = document.createElement("input");
        input.type = "text";
        input.className =
          "w-full p-3 rounded-xl liquid-input text-xs font-bold tracking-wider";
        input.value = String(current);
      }

      input.addEventListener("input", () => {
        selected.props = selected.props || {};
        selected.props[field.key] =
          field.type === "textarea" ? input.value.replace(/\n/g, "<br>") : input.value;

        state.dirty = true;
        state.needsCommit = true;

        renderCanvas();
        renderProperties();
      });

      wrap.appendChild(lab);
      wrap.appendChild(input);
      body.appendChild(wrap);
    });
  }

  // ---------------------------
  // Block library render
  // ---------------------------
  function renderBlockLibrary() {
    const structural = $("#blockLibraryStructural");
    const widgets = $("#blockLibraryWidgets");
    const tplTile = $("#tpl-block-tile");
    const tplRow = $("#tpl-block-widget-row");

    if (!structural || !widgets) return;

    structural.innerHTML = "";
    widgets.innerHTML = "";

    Object.entries(BLOCKS).forEach(([type, def]) => {
      if (def.category === "structural") {
        const node = tplTile
          ? tplTile.content.firstElementChild.cloneNode(true)
          : document.createElement("div");

        node.dataset.blockType = type;
        node.querySelector("i").className =
          `fa-solid ${def.icon} text-xl text-gray-500 group-hover:text-accent-gold transition-colors`;
        node.querySelector("span").textContent = def.label;

        node.addEventListener("dragstart", (e) => dragStart(e, { kind: "new", type }));
        structural.appendChild(node);
      } else {
        const node = tplRow
          ? tplRow.content.firstElementChild.cloneNode(true)
          : document.createElement("div");

        node.dataset.blockType = type;
        node.querySelector("div i").className = `fa-solid ${def.icon} text-white/80`;
        node.querySelector("span.text-xs").textContent = def.label;
        node.querySelector("span.text-[10px]").textContent = "Arrastra al canvas";

        node.addEventListener("dragstart", (e) => dragStart(e, { kind: "new", type }));
        widgets.appendChild(node);
      }
    });
  }

  // ---------------------------
  // Drag & Drop: add block (MVP)
  // ---------------------------
  function dragStart(e, payload) {
    e.dataTransfer.setData("application/json", JSON.stringify(payload));
    e.dataTransfer.effectAllowed = "copy";
  }

  function wireCanvasDnD() {
    const pageEl = $("#canvasPage");
    if (!pageEl) return;

    pageEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    });

    pageEl.addEventListener("drop", (e) => {
      e.preventDefault();

      const page = getActivePage();
      if (!page) {
        toast({ title: "Selecciona una página", tone: "warn" });
        return;
      }

      let payload;
      try {
        payload = JSON.parse(e.dataTransfer.getData("application/json"));
      } catch {
        return;
      }
      if (!payload || payload.kind !== "new") return;

      const def = BLOCKS[payload.type];
      if (!def) return;

      state.layout.push({
        id: crypto.randomUUID(),
        type: payload.type,
        props: JSON.parse(JSON.stringify(def.defaults || {})),
      });

      state.dirty = true;
      state.needsCommit = true;

      renderCanvas();
      toast({ title: "Bloque añadido", message: def.label });
      setSrStatus(`Bloque añadido: ${def.label}`);
    });
  }

  // ---------------------------
  // Selection wiring
  // ---------------------------
  function wireCanvasSelection() {
    const pageEl = $("#canvasPage");
    if (!pageEl) return;

    pageEl.addEventListener("click", (e) => {
      const blockEl = e.target.closest(".editable-block");
      if (!blockEl) return;

      const id = blockEl.dataset.blockId;
      if (!id) return;

      state.selectedBlockId = id;
      renderCanvas();
      renderProperties();
    });
  }

  // ---------------------------
  // Save / Publish — ahora persiste a repo
  // ---------------------------
  function saveDraftLocal({ quiet = false } = {}) {
    const page = getActivePage();
    if (!page) {
      if (!quiet) toast({ title: "Sin página", message: "Selecciona una página antes de guardar.", tone: "warn" });
      return false;
    }

    page.layout = JSON.parse(JSON.stringify(state.layout));
    page.updatedAt = new Date().toISOString();

    // Localmente ya no está “dirty”, pero sigue habiendo “needsCommit” hasta que commitea.
    state.dirty = false;
    state.needsCommit = true;

    setPagePills(page);

    if (!quiet) {
      toast({ title: "Guardado", message: "Cambios preparados para commit." });
      setSrStatus("Cambios preparados para commit.");
    }
    return true;
  }

  async function postContentJson(content, token) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["x-aisa-console-token"] = token;

    const res = await fetch(ENDPOINT_CONTENT, {
      method: "POST",
      headers,
      body: JSON.stringify({ content }),
    });

    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  async function commitContentJson() {
    // Construimos JSON desde páginas (solo HERO por ahora)
    const payload = buildContentFromPages(state.contentJson);

    let token = getStoredToken();
    let { res, data } = await postContentJson(payload, token);

    // Si hay token requerido, pedimos token y reintentamos una vez
    if (res.status === 403) {
      toast({ title: "Auth", message: "Token requerido para guardar.", tone: "warn" });
      token = await requestConsoleToken();
      if (!token) throw new Error("Token no proporcionado");
      setStoredToken(token);
      ({ res, data } = await postContentJson(payload, token));
    }

    if (!res.ok || !data.ok) {
      throw new Error(data?.detail || data?.error || `Save failed (${res.status})`);
    }

    // Éxito
    state.contentJson = payload;
    state.contentLoaded = true;
    state.needsCommit = false;

    setIndicator(data.changed ? "SAVED" : "NO CHANGES", "ok");
    toast({
      title: "Contenido",
      message: data.changed ? "Commit realizado (data/content.json)" : "No había cambios.",
    });

    return true;
  }

  async function saveDraftAndCommit() {
    const ok = saveDraftLocal({ quiet: true });
    if (!ok) return false;

    try {
      setIndicator("SAVING…", "warn");
      await commitContentJson();
      return true;
    } catch (e) {
      setIndicator("SAVE ERROR", "error");
      toast({ title: "Error guardando", message: e.message || String(e), tone: "error", ms: 4500 });
      return false;
    }
  }

  async function triggerDeploy() {
    const r = await fetch(ENDPOINT_DEPLOY, { method: "POST" });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      throw new Error(`Deploy failed (${r.status}): ${txt.slice(0, 200)}`);
    }
    return r.json().catch(() => ({ ok: true }));
  }

  function openPublishModal() {
    const page = getActivePage();
    if (!page) {
      toast({ title: "Sin página", message: "Selecciona una página antes de publicar.", tone: "warn" });
      return;
    }

    setPublishModalInfo(page);
    openModal("modal-publish");
  }

  async function confirmPublish() {
    const page = getActivePage();
    if (!page) return;

    const btn = $("#btnConfirmPublish");
    const oldText = btn?.textContent || "Confirmar";

    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Publicando…";
      }

      // Si hay cambios locales o pendientes de commit, guardamos+commit antes del deploy
      if (state.dirty || state.needsCommit) {
        const ok = await saveDraftAndCommit();
        if (!ok) throw new Error("No se pudo guardar/commit. Publicación cancelada.");
      }

      await triggerDeploy();

      page.status = "published";
      page.updatedAt = new Date().toISOString();
      setPagePills(page);

      closeModal("modal-publish");
      toast({ title: "Publicado", message: "Deploy disparado correctamente." });
      setSrStatus("Publicado. Deploy en curso.");
    } catch (err) {
      toast({
        title: "Error al publicar",
        message: err?.message || String(err),
        tone: "error",
        ms: 4500,
      });
      setSrStatus("Error al publicar.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = oldText;
      }
    }
  }

  // ---------------------------
  // Demo: dashboard populate
  // ---------------------------
  function seedDashboard() {
    const traffic = document.querySelector('[data-metric="traffic"]');
    const health = document.querySelector('[data-metric="gualcamayoHealth"]');
    const energy = document.querySelector('[data-metric="energyMw"]');
    const tasksCount = $("#tasksCount");
    const tasksList = $("#tasksList");

    if (traffic) traffic.textContent = "124.5K";
    if (health) health.textContent = "98.5%";
    if (energy) energy.innerHTML = `42 <span class="text-lg text-gray-500">MW</span>`;

    if (tasksCount) tasksCount.textContent = "3";
    if (tasksList) {
      tasksList.innerHTML = `
        <li class="flex items-center gap-3 text-xs text-gray-300">
          <div class="w-4 h-4 rounded border border-gray-500"></div>
          <span>Revisar Nota de Prensa RIGI</span>
        </li>
        <li class="flex items-center gap-3 text-xs text-gray-300">
          <div class="w-4 h-4 rounded border border-gray-500"></div>
          <span>Aprobar Fotos Drone</span>
        </li>
        <li class="flex items-center gap-3 text-xs text-gray-300">
          <div class="w-4 h-4 rounded border border-gray-500"></div>
          <span>Optimizar Home Móvil</span>
        </li>
      `;
    }

    const tbody = $("#activityBody");
    if (tbody) {
      tbody.innerHTML = `
        <tr class="hover:bg-white/5 transition-colors group cursor-pointer">
          <td class="px-6 py-3 flex items-center gap-3">
            <img src="https://ui-avatars.com/api/?name=Laura+M&background=8B5CF6&color=fff" class="w-6 h-6 rounded-full grayscale group-hover:grayscale-0 transition-all" alt="Laura">
            <span class="text-white font-medium">Laura M.</span>
          </td>
          <td class="px-6 py-3"><span class="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20">EDICIÓN</span></td>
          <td class="px-6 py-3">Página: Sostenibilidad</td>
          <td class="px-6 py-3 font-mono text-xs">14:02</td>
        </tr>
        <tr class="hover:bg-white/5 transition-colors group cursor-pointer">
          <td class="px-6 py-3 flex items-center gap-3">
            <img src="https://ui-avatars.com/api/?name=Juan+S&background=10B981&color=fff" class="w-6 h-6 rounded-full grayscale group-hover:grayscale-0 transition-all" alt="Juan">
            <span class="text-white font-medium">Juan S.</span>
          </td>
          <td class="px-6 py-3"><span class="px-2 py-0.5 rounded bg-green-500/10 text-green-400 text-[10px] font-bold border border-green-500/20">PUBLISH</span></td>
          <td class="px-6 py-3">Noticia: Inversión RIGI</td>
          <td class="px-6 py-3 font-mono text-xs">12:30</td>
        </tr>
        <tr class="hover:bg-white/5 transition-colors group cursor-pointer">
          <td class="px-6 py-3 flex items-center gap-3">
            <div class="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-[10px] text-black font-bold">SYS</div>
            <span class="text-white font-medium">System</span>
          </td>
          <td class="px-6 py-3"><span class="px-2 py-0.5 rounded bg-red-500/10 text-red-400 text-[10px] font-bold border border-red-500/20">ALERT</span></td>
          <td class="px-6 py-3">Latencia Alta: API Gualcamayo</td>
          <td class="px-6 py-3 font-mono text-xs">09:15</td>
        </tr>
      `;
    }
  }

  // ---------------------------
  // Event wiring
  // ---------------------------
  function wireTopbarButtons() {
    $("#btnSave")?.addEventListener("click", async () => {
      await saveDraftAndCommit();
    });

    $("#btnPublish")?.addEventListener("click", openPublishModal);
    $("#btnConfirmPublish")?.addEventListener("click", confirmPublish);

    $("#btnBack")?.addEventListener("click", () => showView("dashboard"));
  }

  function wirePageSelect() {
    const select = $("#pageSelect");
    if (!select) return;

    select.innerHTML = "";
    state.pages.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.name} · /${p.slug}`;
      select.appendChild(opt);
    });

    if (state.pages[0]) {
      select.value = state.pages[0].id;
      setActivePage(select.value);
    }

    select.addEventListener("change", async () => {
      // Guardrail: evitar perder cambios
      if (state.dirty || state.needsCommit) {
        const ok = window.confirm("Tienes cambios sin guardar. ¿Quieres descartarlos y cambiar de página?");
        if (!ok) {
          // restaurar selección anterior
          select.value = state.activePageId || "";
          return;
        }
        state.dirty = false;
        // si descartas, también descartas commit pendiente
        state.needsCommit = false;
      }

      setActivePage(select.value);
    });
  }

  function wireGlobalDelegation() {
    // IMPORTANTE:
    // Usamos CAPTURA (3er parámetro true) para que el handler funcione
    // incluso si algún componente/interacción hace stopPropagation() en bubble.
    document.addEventListener("click", (e) => {
      const el = getActionElementFromEvent(e);
      if (!el) return;

      const action = el.dataset.action;

      if (action === "switch-view") {
        e.preventDefault();
        const view = el.dataset.view || "dashboard";
        showView(view);
        return;
      }

      if (action === "nav") {
        e.preventDefault();
        showView(el.dataset.targetView || "dashboard");
        return;
      }

      if (action === "close-modal") {
        e.preventDefault();

        // si cierran auth mientras esperamos token, cancelamos
        if (el.dataset.target === "modal-auth" && tokenResolver) {
          tokenResolver("");
          tokenResolver = null;
        }

        closeModal(el.dataset.target);
        return;
      }

      if (action === "open-notifications") {
        e.preventDefault();
        toast({ title: "Notificaciones", message: "Función en construcción.", tone: "info" });
        return;
      }

      if (action === "open-ai") {
        e.preventDefault();
        toast({ title: "AI Assistant", message: "Función en construcción.", tone: "info" });
        return;
      }

      if (action === "open-health") {
        e.preventDefault();
        const msg =
          state.contentLoaded
            ? "Content Engine: activo. Guardar hace commit en GitHub."
            : "Content Engine: no disponible (content.json no cargó).";
        toast({ title: "Sistema", message: msg, tone: state.contentLoaded ? "info" : "warn" });
        return;
      }

      if (action === "open-settings") {
        e.preventDefault();
        toast({ title: "Configuración", message: "Función en construcción.", tone: "info" });
        return;
      }

      // Botón “Ir al Gestor” (Dashboard)
      if (action === "open-tasks") {
        e.preventDefault();
        toast({ title: "Tareas", message: "Gestor de tareas: en construcción.", tone: "info" });
        return;
      }

      if (action === "back") {
        e.preventDefault();
        showView("dashboard");
      }
    }, true); // <- CAPTURE

    document.addEventListener("keydown", async (e) => {
      if (e.key === "Escape") closeAllModals();

      // Cmd/Ctrl+K: focus search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        $("#globalSearch")?.focus();
      }

      // Cmd/Ctrl+S: guardar+commit
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        await saveDraftAndCommit();
      }

      // Cmd/Ctrl+Enter: publish
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        openPublishModal();
      }
    });

    $("#brandArea")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        showView("dashboard");
      }
    });
  }

  // ---------------------------
  // Content load
  // ---------------------------
  async function loadContentJson() {
    try {
      const res = await fetch(CONTENT_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json || typeof json !== "object") throw new Error("Invalid JSON");
      state.contentJson = json;
      state.contentLoaded = true;
      setIndicator("CONTENT OK", "ok");
      return json;
    } catch {
      state.contentLoaded = false;
      setIndicator("DEMO", "warn");
      return null;
    }
  }

  // ---------------------------
  // Init
  // ---------------------------
  async function init() {
    wireAuthModal();

    setIndicator("LOADING…", "warn");
    state.pages = demoPages();

    // Intenta hidratar heroes desde /data/content.json
    const content = await loadContentJson();
    if (content) {
      applyContentToPages(content);
    }

    showView("dashboard");
    seedDashboard();
    renderBlockLibrary();
    wirePageSelect();
    wireTopbarButtons();
    wireCanvasDnD();
    wireCanvasSelection();
    wireGlobalDelegation();

    toast({
      title: "Console lista",
      message: "Guardar comitea data/content.json. Publicar dispara deploy.",
      tone: "info",
    });
    setSrStatus("Console lista.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
