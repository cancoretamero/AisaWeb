// console/app.js
// AISA Liquid Command Center — Console MVP (sin CMS todavía)
// - Navegación de vistas (Dashboard / Editor / etc.)
// - Editor demo: páginas + layout + selección + propiedades
// - Guardar (local demo)
// - Publicar (REAL): llama a /.netlify/functions/deploy
//
// Nota: esto es “compacto” a propósito. Cuando conectemos Strapi,
// las funciones save/publish pasarán a persistir en CMS.

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const ENDPOINT_DEPLOY = "/.netlify/functions/deploy";

  const state = {
    view: "dashboard",
    pages: [],
    activePageId: null,
    layout: [],
    selectedBlockId: null,
    dirty: false,
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

  const nowHuman = () => new Date().toLocaleString();

  function setSrStatus(msg) {
    const el = $("#sr-status");
    if (el) el.textContent = msg;
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
    ["modal-auth", "modal-publish"].forEach(closeModal);
  }

  // ---------------------------
  // Views
  // ---------------------------
  function showView(viewName) {
    state.view = viewName;

    // Toggle view sections
    const views = $$("[data-view]");
    views.forEach((v) => {
      const active = v.dataset.view === viewName;
      v.classList.toggle("opacity-100", active);
      v.classList.toggle("opacity-0", !active);
      v.classList.toggle("pointer-events-none", !active);
      v.classList.toggle("translate-y-0", active);
      v.classList.toggle("translate-y-4", !active);
    });

    // Update nav active styles
    const navLinks = $$('[data-action="switch-view"]');
    navLinks.forEach((a) => {
      const isActive = a.dataset.view === viewName;

      if (isActive) {
        a.setAttribute("aria-current", "page");
        a.className =
          "group flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium text-black bg-accent-gold shadow-[0_0_15px_rgba(250,204,21,0.3)] transition-all transform scale-[1.02]";

        // add pulse dot if not exists
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

    // Breadcrumb current label
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

    // Page status pill only in editor
    const pill = $("#pageStatusPill");
    if (pill) pill.classList.toggle("hidden", viewName !== "editor");
  }

  // ---------------------------
  // DEMO content model (hasta conectar CMS)
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
        wrapper.innerHTML = `
          <div class="block-label"><i class="fa-solid fa-pen-nib mr-1"></i> HERO</div>
          <div class="absolute inset-0 bg-cover bg-center opacity-20" style="background-image:url('${bg}')"></div>
          <div class="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black"></div>

          <div class="relative z-10">
            <span class="text-accent-gold text-xs font-bold uppercase tracking-[0.2em] mb-6 block">
              ${block.props?.subtitle || ""}
            </span>
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

    // Group title
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
        renderCanvas();
        // maintain selection UI without re-click
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
  // Save / Publish
  // ---------------------------
  function saveDraftLocal() {
    const page = getActivePage();
    if (!page) {
      toast({ title: "Sin página", message: "Selecciona una página antes de guardar.", tone: "warn" });
      return;
    }

    page.layout = JSON.parse(JSON.stringify(state.layout));
    page.updatedAt = new Date().toISOString();
    state.dirty = false;

    setPagePills(page);
    toast({ title: "Guardado", message: "Borrador actualizado (modo demo)." });
    setSrStatus("Borrador guardado.");
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

    // If there are local changes, force save first (demo safety)
    if (state.dirty) {
      saveDraftLocal();
    }

    const btn = $("#btnConfirmPublish");
    const oldText = btn?.textContent || "Confirmar";

    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Publicando…";
      }

      // 1) Trigger deploy
      await triggerDeploy();

      // 2) Mark published (demo)
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

    // Activity table
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
    $("#btnSave")?.addEventListener("click", saveDraftLocal);
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

    // default first
    if (state.pages[0]) {
      select.value = state.pages[0].id;
      setActivePage(select.value);
    }

    select.addEventListener("change", () => setActivePage(select.value));
  }

  function wireGlobalDelegation() {
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (!el) return;

      const action = el.dataset.action;

      if (action === "switch-view") {
        e.preventDefault();
        showView(el.dataset.view);
        return;
      }

      if (action === "nav") {
        e.preventDefault();
        showView(el.dataset.targetView || "dashboard");
        return;
      }

      if (action === "close-modal") {
        e.preventDefault();
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
        toast({ title: "Sistema", message: "Console en modo DEMO (CMS aún no conectado).", tone: "warn" });
        return;
      }

      if (action === "open-settings") {
        e.preventDefault();
        toast({ title: "Configuración", message: "Función en construcción.", tone: "info" });
        return;
      }

      if (action === "back") {
        e.preventDefault();
        showView("dashboard");
      }
    });

    // Modal overlay click closes (has data-action close-modal already), and ESC closes all
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAllModals();

      // Cmd/Ctrl+K: focus search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        $("#globalSearch")?.focus();
      }

      // Cmd/Ctrl+S: save
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveDraftLocal();
      }

      // Cmd/Ctrl+Enter: publish
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        openPublishModal();
      }
    });

    // Sidebar brandArea keyboard
    $("#brandArea")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        showView("dashboard");
      }
    });
  }

  // ---------------------------
  // CMS indicator (DEMO)
  // ---------------------------
  function setCmsIndicatorDemo() {
    const label = $("#cmsLabel");
    const dot = $("#cmsDot");
    const ping = $("#cmsPing");

    if (label) label.textContent = "DEMO";
    if (dot) dot.className = "relative w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_10px_#FACC15]";
    if (ping) ping.className = "absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-40";
  }

  // ---------------------------
  // Init
  // ---------------------------
  function init() {
    setCmsIndicatorDemo();

    state.pages = demoPages();

    showView("dashboard");
    seedDashboard();
    renderBlockLibrary();
    wirePageSelect();
    wireTopbarButtons();
    wireCanvasDnD();
    wireCanvasSelection();
    wireGlobalDelegation();

    toast({ title: "Console lista", message: "Publicar ya llama a Netlify Deploy.", tone: "info" });
    setSrStatus("Console lista.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
