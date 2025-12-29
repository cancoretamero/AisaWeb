// console/app.js
// MVP funcional: switch de vistas + modales + demo editor + selección + properties.
// Luego conectamos Strapi sin reescribir la UI.

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const state = {
  view: "dashboard",
  page: null,
  pages: [],
  layout: [],
  selectedBlockId: null,
  dirty: false,
};

// ---------- Toast ----------
function toast({ title = "OK", message = "", tone = "info", ms = 2600 } = {}) {
  const root = $("#toast-root");
  if (!root) return;

  const el = document.createElement("div");
  el.className = `
    pointer-events-auto glass-panel-pro rounded-2xl px-4 py-3 border
    ${tone === "error" ? "border-red-500/30" : tone === "warn" ? "border-yellow-500/30" : "border-white/10"}
  `.trim();

  el.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="mt-0.5 w-2.5 h-2.5 rounded-full ${tone === "error" ? "bg-red-500" : tone === "warn" ? "bg-yellow-400" : "bg-emerald-400"} shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[c]));
}

// ---------- Modal ----------
function openModal(id) {
  const m = $(`#${id}`);
  if (!m) return;
  m.classList.remove("hidden");
}
function closeModal(id) {
  const m = $(`#${id}`);
  if (!m) return;
  m.classList.add("hidden");
}
function closeAllModals() {
  ["modal-auth", "modal-publish"].forEach(closeModal);
}

// ---------- Views ----------
function showView(viewName) {
  state.view = viewName;

  // sections
  const sections = $$("[data-view]");
  sections.forEach((s) => {
    const active = s.dataset.view === viewName;
    s.classList.toggle("opacity-100", active);
    s.classList.toggle("opacity-0", !active);
    s.classList.toggle("pointer-events-none", !active);
    s.classList.toggle("translate-y-0", active);
    s.classList.toggle("translate-y-4", !active);
  });

  // nav active
  const navLinks = $$('[data-action="switch-view"]');
  navLinks.forEach((a) => {
    const isActive = a.dataset.view === viewName;
    a.setAttribute("aria-current", isActive ? "page" : "false");

    if (isActive) {
      a.className =
        "group flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium text-black bg-accent-gold shadow-[0_0_15px_rgba(250,204,21,0.3)] transition-all transform scale-[1.02]";
      if (!a.querySelector(".animate-pulse")) {
        const dot = document.createElement("div");
        dot.className = "ml-auto w-2 h-2 rounded-full bg-black animate-pulse";
        a.appendChild(dot);
      }
    } else {
      a.className =
        "group flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all";
      const dot = a.querySelector(".animate-pulse");
      if (dot) dot.remove();
    }
  });

  // breadcrumbs
  const crumb = $("#breadcrumbCurrent");
  if (crumb) crumb.textContent = viewName === "dashboard" ? "Dashboard" :
    viewName === "editor" ? "Editor" :
    viewName === "blog" ? "Blog & Prensa" :
    viewName === "media" ? "Media Assets" :
    viewName === "liveops" ? "Live Data Ops" :
    viewName === "audit" ? "Auditoría" : viewName;

  // page pill visibility
  const pill = $("#pageStatusPill");
  if (pill) pill.classList.toggle("hidden", viewName !== "editor");
}

// ---------- Demo Data ----------
function demoPages() {
  const now = new Date();
  const iso = now.toISOString();

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
            desc: "En Aisa Group, la sostenibilidad es el núcleo de nuestra estrategia empresarial. Nos comprometemos a operar de manera responsable.",
            bgImage:
              "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=3870&auto=format&fit=crop",
          },
        },
        {
          id: crypto.randomUUID(),
          type: "metric",
          props: { icon: "fa-leaf", accent: "green", value: "60%", label: "Reducción Huella CO2" },
        },
        {
          id: crypto.randomUUID(),
          type: "metric",
          props: { icon: "fa-users", accent: "gold", value: "92%", label: "Empleo Local" },
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
            desc: "Un holding familiar transformando la minería tradicional en energía renovable y desarrollo sostenible.",
            bgImage:
              "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=3870&auto=format&fit=crop",
          },
        },
      ],
    },
  ];
}

const BLOCKS = {
  hero: {
    label: "Hero",
    category: "structural",
    icon: "fa-heading",
    schema: [
      { key: "subtitle", label: "Subtítulo", type: "text" },
      { key: "title", label: "Título", type: "textarea" },
      { key: "desc", label: "Descripción", type: "textarea" },
      { key: "bgImage", label: "Background URL", type: "text" },
    ],
    defaults: {
      subtitle: "Nuevo bloque",
      title: "Título<br>Principal",
      desc: "Descripción del bloque…",
      bgImage: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=3870&auto=format&fit=crop",
    },
  },
  metric: {
    label: "Metric",
    category: "widgets",
    icon: "fa-chart-line",
    schema: [
      { key: "value", label: "Valor", type: "text" },
      { key: "label", label: "Etiqueta", type: "text" },
      { key: "icon", label: "Icono (FA)", type: "text" },
      { key: "accent", label: "Acento (gold/green/blue/purple/red)", type: "text" },
    ],
    defaults: { value: "—", label: "Nueva métrica", icon: "fa-bolt", accent: "gold" },
  },
};

// ---------- Canvas render ----------
function renderCanvas() {
  const pageEl = $("#canvasPage");
  const empty = $("#canvasEmpty");
  if (!pageEl) return;

  if (!state.page) {
    if (empty) empty.classList.remove("hidden");
    return;
  }

  if (empty) empty.classList.add("hidden");

  // Clear page content (keep container)
  pageEl.innerHTML = "";

  // Hero first full-width, then metric cards etc.
  state.layout.forEach((block) => {
    const wrapper = document.createElement("div");
    wrapper.className = "editable-block";
    wrapper.dataset.blockId = block.id;

    if (block.type === "hero") {
      wrapper.classList.add("p-16", "text-center", "border-b", "border-white/5", "relative", "overflow-hidden");
      wrapper.innerHTML = `
        <div class="block-label"><i class="fa-solid fa-pen-nib"></i> HERO</div>
        <div class="absolute inset-0 bg-cover bg-center opacity-20" style="background-image:url('${block.props.bgImage || ""}')"></div>
        <div class="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black"></div>
        <div class="relative z-10">
          <span class="text-accent-gold text-xs font-bold uppercase tracking-[0.2em] mb-6 block">${block.props.subtitle || ""}</span>
          <h1 class="font-display text-5xl md:text-7xl font-bold text-white mb-8 text-glow leading-tight">${block.props.title || ""}</h1>
          <p class="text-gray-300 text-xl font-light leading-relaxed max-w-3xl mx-auto">${block.props.desc || ""}</p>
        </div>
      `;
    } else if (block.type === "metric") {
      wrapper.classList.add("m-10", "glass-panel-pro", "p-8", "rounded-[2rem]");
      const accent = (block.props.accent || "gold").toLowerCase();
      const icon = block.props.icon || "fa-bolt";
      const glow = accent === "green" ? "#10B981" :
                   accent === "blue" ? "#3B82F6" :
                   accent === "purple" ? "#8B5CF6" :
                   accent === "red" ? "#EF4444" : "#FACC15";
      wrapper.innerHTML = `
        <div class="block-label">WIDGET</div>
        <div class="flex justify-between items-start mb-6">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center shadow-[0_0_15px_rgba(250,204,21,0.2)]" style="background:${glow}22;color:${glow}">
            <i class="fa-solid ${icon} text-xl"></i>
          </div>
          <span class="text-[10px] font-mono px-3 py-1 rounded-full bg-black/50 border border-white/10 text-gray-300">EDITABLE</span>
        </div>
        <h3 class="text-5xl font-display font-bold text-white mb-2">${escapeHtml(block.props.value || "—")}</h3>
        <p class="text-xs text-gray-400 uppercase tracking-widest font-bold">${escapeHtml(block.props.label || "")}</p>
      `;
    } else {
      wrapper.classList.add("m-10", "p-10", "border", "border-white/10", "rounded-[2rem]");
      wrapper.innerHTML = `<div class="block-label">${block.type.toUpperCase()}</div><div class="text-gray-400">Bloque: ${block.type}</div>`;
    }

    if (state.selectedBlockId === block.id) wrapper.classList.add("selected");
    pageEl.appendChild(wrapper);
  });

  // Add drop zone
  const drop = document.createElement("div");
  drop.id = "dropZone";
  drop.className = "mx-10 mb-10 h-32 border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center text-gray-600 hover:border-accent-gold/50 hover:text-accent-gold hover:bg-white/[0.02] transition-all";
  drop.innerHTML = `
    <div class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2">
      <i class="fa-solid fa-plus"></i>
    </div>
    <span class="text-xs uppercase tracking-widest font-bold">Arrastra aquí para añadir</span>
  `;
  pageEl.appendChild(drop);
}

// ---------- Properties panel ----------
function showPropertiesForSelected() {
  const empty = $("#prop-empty");
  const active = $("#prop-active");
  const body = $("#propBody");
  const badge = $("#prop-type-badge");

  if (!empty || !active || !body || !badge) return;

  const block = state.layout.find((b) => b.id === state.selectedBlockId);
  if (!block) {
    empty.style.display = "flex";
    active.classList.add("hidden");
    return;
  }

  empty.style.display = "none";
  active.classList.remove("hidden");

  badge.textContent = (block.type || "BLOCK").toUpperCase();

  // render fields
  const def = BLOCKS[block.type];
  body.innerHTML = "";

  if (!def) {
    body.innerHTML = `<div class="text-xs text-gray-500 italic">Sin esquema para este bloque.</div>`;
    return;
  }

  // content group
  const group = document.createElement("div");
  group.className = "space-y-4";
  group.innerHTML = `
    <label class="text-[10px] font-extrabold text-accent-gold uppercase tracking-widest flex items-center gap-2">
      <i class="fa-solid fa-pen"></i> Contenido
    </label>
  `;

  def.schema.forEach((f) => {
    const val = (block.props?.[f.key] ?? "");
    const wrap = document.createElement("div");
    wrap.className = "group";

    const label = document.createElement("label");
    label.className = "text-[10px] text-gray-400 mb-1.5 block uppercase font-bold group-focus-within:text-white transition-colors";
    label.textContent = f.label;

    let input;
    if (f.type === "textarea") {
      input = document.createElement("textarea");
      input.rows = 3;
      input.className = "w-full p-3 rounded-xl liquid-input text-xs leading-relaxed resize-none";
      input.value = String(val).replace(/<br\s*\/?>/g, "\n");
    } else {
      input = document.createElement("input");
      input.type = "text";
      input.className = "w-full p-3 rounded-xl liquid-input text-xs font-bold tracking-wider";
      input.value = String(val);
    }

    input.addEventListener("input", () => {
      const raw = input.value;
      block.props = block.props || {};
      block.props[f.key] = f.type === "textarea" ? raw.replace(/\n/g, "<br>") : raw;
      state.dirty = true;
      renderCanvas();
      // keep selected style
      showPropertiesForSelected();
    });

    wrap.appendChild(label);
    wrap.appendChild(input);
    group.appendChild(wrap);
  });

  body.appendChild(group);
}

// ---------- Page selection ----------
function setActivePage(pageId) {
  const page = state.pages.find((p) => p.id === pageId);
  state.page = page || null;
  state.layout = page ? JSON.parse(JSON.stringify(page.layout || [])) : [];
  state.selectedBlockId = null;
  state.dirty = false;

  // update pill
  $("#pageSlugPill").textContent = page ? page.slug : "—";
  $("#pageStatePill").textContent = page ? page.status : "—";
  $("#pageUpdatedAt").textContent = page ? new Date(page.updatedAt).toLocaleString() : "—";

  renderCanvas();
  showPropertiesForSelected();
}

// ---------- Block library ----------
function renderBlockLibrary() {
  const structural = $("#blockLibraryStructural");
  const widgets = $("#blockLibraryWidgets");
  if (!structural || !widgets) return;

  structural.innerHTML = "";
  widgets.innerHTML = "";

  const tplTile = $("#tpl-block-tile");
  const tplRow = $("#tpl-block-widget-row");

  Object.entries(BLOCKS).forEach(([type, def]) => {
    if (def.category === "structural") {
      const node = tplTile ? tplTile.content.firstElementChild.cloneNode(true) : document.createElement("div");
      node.dataset.blockType = type;
      node.querySelector("i").className = `fa-solid ${def.icon} text-xl text-gray-500 group-hover:text-accent-gold transition-colors`;
      node.querySelector("span").textContent = def.label;
      node.addEventListener("dragstart", (e) => onDragStart(e, { kind: "new", type }));
      structural.appendChild(node);
    } else {
      const node = tplRow ? tplRow.content.firstElementChild.cloneNode(true) : document.createElement("div");
      node.dataset.blockType = type;
      node.querySelector("div i").className = `fa-solid ${def.icon} text-white/80`;
      node.querySelector("span.text-xs").textContent = def.label;
      node.querySelector("span.text-[10px]").textContent = "Arrastra al canvas";
      node.addEventListener("dragstart", (e) => onDragStart(e, { kind: "new", type }));
      widgets.appendChild(node);
    }
  });
}

// ---------- Drag & Drop (MVP: add block) ----------
function onDragStart(e, payload) {
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
    if (!state.page) return toast({ title: "Selecciona una página", tone: "warn" });

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
  });
}

// ---------- Click handling ----------
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
    showPropertiesForSelected();
  });
}

// ---------- Save / Publish (demo) ----------
function saveDraft() {
  if (!state.page) return toast({ title: "Sin página", message: "Selecciona una página antes de guardar.", tone: "warn" });
  // demo: copy state.layout into page
  state.page.layout = JSON.parse(JSON.stringify(state.layout));
  state.page.updatedAt = new Date().toISOString();
  state.dirty = false;
  $("#pageUpdatedAt").textContent = new Date(state.page.updatedAt).toLocaleString();
  toast({ title: "Guardado", message: "Borrador actualizado (modo demo)" });
}

function requestPublish() {
  if (!state.page) return toast({ title: "Sin página", message: "Selecciona una página antes de publicar.", tone: "warn" });

  $("#publishSlug").textContent = state.page.slug;
  $("#publishState").textContent = state.page.status;
  openModal("modal-publish");
}

function confirmPublish() {
  closeModal("modal-publish");
  // demo: mark published
  state.page.status = "published";
  $("#pageStatePill").textContent = "published";
  toast({ title: "Publicado", message: "Publicación simulada (modo demo)" });
}

// ---------- Init ----------
function init() {
  // Set CMS status to DEMO unless wired later
  $("#cmsLabel").textContent = "DEMO";
  $("#cmsDot").className = "relative w-3 h-3 bg-yellow-400 rounded-full shadow-[0_0_10px_#FACC15]";
  $("#cmsPing").className = "absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-40";

  // demo pages
  state.pages = demoPages();
  const sel = $("#pageSelect");
  if (sel) {
    sel.innerHTML = "";
    state.pages.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.name} · /${p.slug}`;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", () => setActivePage(sel.value));
    // default
    sel.value = state.pages[0].id;
    setActivePage(sel.value);
  }

  renderBlockLibrary();
  wireCanvasDnD();
  wireCanvasSelection();

  // action delegation
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (!el) return;

    const action = el.dataset.action;

    if (action === "switch-view") {
      e.preventDefault();
      showView(el.dataset.view);
      return;
    }

    if (action === "close-modal") {
      e.preventDefault();
      closeModal(el.dataset.target);
      return;
    }

    if (action === "save") {
      e.preventDefault();
      saveDraft();
      return;
    }

    if (action === "publish") {
      e.preventDefault();
      requestPublish();
      return;
    }

    if (action === "back") {
      e.preventDefault();
      showView("dashboard");
      return;
    }

    if (action === "nav") {
      e.preventDefault();
      showView(el.dataset.targetView || "dashboard");
      return;
    }
  });

  // explicit buttons
  $("#btnSave")?.addEventListener("click", saveDraft);
  $("#btnPublish")?.addEventListener("click", requestPublish);
  $("#btnConfirmPublish")?.addEventListener("click", confirmPublish);

  // close modals on ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllModals();

    // Cmd/Ctrl+K focus search
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      $("#globalSearch")?.focus();
    }

    // Cmd/Ctrl+S save
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      saveDraft();
    }

    // Cmd/Ctrl+Enter publish
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      requestPublish();
    }
  });

  // default view
  showView("dashboard");

  toast({ title: "Console lista", message: "CSS y JS cargados correctamente.", tone: "info" });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
