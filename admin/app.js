/* admin/app.js */
/* global Sortable, Fuse, dayjs, Ajv, FilePond */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const STORAGE_KEY = 'aisa_admin_state_v1';
const AUTH_KEY = 'aisa_admin_authed_v1';

const uid = (p = 'id') => `${p}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
const safe = (v) => (v ?? '').toString();

const fmtDate = (iso) => {
  try {
    if (window.dayjs) return window.dayjs(iso).format('YYYY-MM-DD');
  } catch {}
  return (iso || '').slice(0, 10) || '—';
};

const DEMO = () => {
  const media = [
    { id: 'm1', name: 'ship-01.jpg', url: 'https://source.unsplash.com/800x800/?ship,ocean', createdAt: new Date().toISOString() },
    { id: 'm2', name: 'gold-01.jpg', url: 'https://source.unsplash.com/800x800/?gold,bar', createdAt: new Date().toISOString() },
    { id: 'm3', name: 'office-01.jpg', url: 'https://source.unsplash.com/800x800/?office,building', createdAt: new Date().toISOString() },
    { id: 'm4', name: 'mine-01.jpg', url: 'https://source.unsplash.com/800x800/?mine,industry', createdAt: new Date().toISOString() },
    { id: 'm5', name: 'solar-01.jpg', url: 'https://source.unsplash.com/800x800/?solar,panels', createdAt: new Date().toISOString() },
    { id: 'm6', name: 'fish-01.jpg', url: 'https://source.unsplash.com/800x800/?fishing,boat', createdAt: new Date().toISOString() },
    { id: 'm7', name: 'map-01.jpg', url: 'https://source.unsplash.com/800x800/?map,world', createdAt: new Date().toISOString() },
    { id: 'm8', name: 'port-01.jpg', url: 'https://source.unsplash.com/800x800/?port,container', createdAt: new Date().toISOString() },
  ];

  const docs = [
    { id: 'd1', title: 'Reporte Corporativo 2026', category: 'Corporate', date: '2026-01-10', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
    { id: 'd2', title: 'Presentación Inversores', category: 'Investors', date: '2026-01-12', url: 'https://www.africau.edu/images/default/sample.pdf' },
    { id: 'd3', title: 'Política ESG', category: 'Compliance', date: '2026-01-15', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
  ];

  const pages = [
    {
      id: 'p_home',
      name: 'Home',
      slug: '/index.html',
      updatedAt: new Date().toISOString(),
      blocks: [
        { id: 'b_h1', type: 'Hero', title: 'AISA Group', subtitle: 'Global Investment Holdings', body: 'Vista previa de hero.', imageId: 'm2', docId: null },
        { id: 'b_h2', type: 'Section', title: 'Minning & Energy', subtitle: 'Sostenibilidad', body: 'Sección demo.', imageId: 'm5', docId: 'd3' },
        { id: 'b_h3', type: 'CTA', title: 'Contact', subtitle: 'Let’s talk', body: 'Call to action demo.', imageId: 'm3', docId: null },
      ],
    },
    {
      id: 'p_about',
      name: 'Nosotros',
      slug: '/about.html',
      updatedAt: new Date().toISOString(),
      blocks: [
        { id: 'b_a1', type: 'Hero', title: 'Quiénes Somos', subtitle: 'AISA', body: 'Bloque demo.', imageId: 'm3', docId: null },
        { id: 'b_a2', type: 'Timeline', title: 'Historia', subtitle: 'Evolución', body: 'Timeline demo.', imageId: 'm7', docId: 'd2' },
      ],
    },
    {
      id: 'p_cabo',
      name: 'Cabo Vírgenes',
      slug: '/cabo-virgenes.html',
      updatedAt: new Date().toISOString(),
      blocks: [
        { id: 'b_c1', type: 'Hero', title: 'Cabo Vírgenes', subtitle: 'Pesca Austral', body: 'Bloque demo.', imageId: 'm1', docId: null },
        { id: 'b_c2', type: 'Gallery', title: 'Flota', subtitle: 'Vessels', body: 'Galería demo.', imageId: 'm6', docId: 'd1' },
      ],
    },
  ];

  const news = [
    { id: 'n1', title: 'AISA impulsa nuevo roadmap ESG', date: '2026-01-18', status: 'PUBLISHED', excerpt: 'Actualización de estrategia ESG.', body: 'Contenido demo.' },
    { id: 'n2', title: 'Cabo Vírgenes optimiza cadena logística', date: '2026-01-16', status: 'DRAFT', excerpt: 'Mejoras operativas.', body: 'Contenido demo.' },
  ];

  const seo = {
    siteTitle: 'AISA Group',
    siteDescription: 'Holding familiar con inversión global.',
    perPage: {
      'Home (index)': { title: 'AISA Group | Global Investment Holdings' },
      'Nosotros': { title: 'AISA | Nosotros' },
    },
  };

  return {
    version: 'v2.4.0',
    lastDeployAt: new Date().toISOString(),
    pages,
    news,
    media,
    docs,
    seo,
    audit: [
      { icon: 'check', title: 'Publicación Exitosa', user: 'Admin', when: 'Hace 2h' },
      { icon: 'save', title: 'Borrador Guardado: Home', user: 'Admin', when: 'Hace 3h' },
    ],
  };
};

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEMO();
};

let state = loadState();
let dirty = false;

let currentView = 'dashboard';
let selectedPageId = state.pages?.[0]?.id ?? null;
let selectedBlockId = null;
let blockDraft = null;

let pendingView = null;
let pickerContext = null; // { kind: 'media' | 'doc', onPick: (id)=>void }

let sortableOutline = null;

const ajv = window.Ajv ? new window.Ajv({ allErrors: true, strict: false }) : null;
const validateBlock = ajv
  ? ajv.compile({
      type: 'object',
      required: ['id', 'type'],
      properties: {
        id: { type: 'string' },
        type: { type: 'string' },
        title: { type: 'string' },
        subtitle: { type: 'string' },
        body: { type: 'string' },
        imageId: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        docId: { anyOf: [{ type: 'string' }, { type: 'null' }] },
      },
      additionalProperties: true,
    })
  : null;

const getPage = () => state.pages.find((p) => p.id === selectedPageId) || null;
const getBlock = (page, blockId) => (page?.blocks || []).find((b) => b.id === blockId) || null;
const getMedia = (id) => state.media.find((m) => m.id === id) || null;
const getDoc = (id) => state.docs.find((d) => d.id === id) || null;

const setDirty = (v) => {
  dirty = !!v;
  const envLabel = $('#envLabel');
  const di = $('#dirtyIndicator');

  if (envLabel) envLabel.textContent = dirty ? 'Production • Dirty' : 'Production';
  if (di) {
    const ping = di.querySelector('.animate-ping');
    const dot = di.querySelector('span.relative');
    if (dirty) {
      ping?.classList.remove('bg-emerald-400');
      dot?.classList.remove('bg-emerald-500');
      ping?.classList.add('bg-accent-gold');
      dot?.classList.add('bg-accent-gold');
    } else {
      ping?.classList.remove('bg-accent-gold');
      dot?.classList.remove('bg-accent-gold');
      ping?.classList.add('bg-emerald-400');
      dot?.classList.add('bg-emerald-500');
    }
  }
};

const showLoading = (on) => {
  const el = $('#loadingOverlay');
  if (!el) return;
  el.classList.toggle('hidden', !on);
};

const toast = (title, message, iconClass = 'fa-circle-info') => {
  const root = $('#toastRoot');
  const tpl = $('#tplToast');
  if (!root || !tpl) return;

  const node = tpl.content.firstElementChild.cloneNode(true);
  const icon = node.querySelector('[data-field="icon"]');
  const t = node.querySelector('[data-field="title"]');
  const msg = node.querySelector('[data-field="message"]');

  if (icon) icon.className = `fa-solid ${iconClass}`;
  if (t) t.textContent = title;
  if (msg) msg.textContent = message;

  root.appendChild(node);
  requestAnimationFrame(() => {
    node.classList.remove('translate-x-10', 'opacity-0');
    node.classList.add('translate-x-0', 'opacity-100');
  });

  setTimeout(() => {
    node.classList.add('translate-x-10', 'opacity-0');
    setTimeout(() => node.remove(), 450);
  }, 4500);
};

const openModal = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  if (el.classList.contains('opacity-0')) {
    requestAnimationFrame(() => el.classList.remove('opacity-0'));
  }
};

const closeModal = (id) => {
  const el = document.getElementById(id);
  if (!el) return;

  if (el.id === 'modalAuth') {
    el.classList.add('opacity-0');
    setTimeout(() => el.classList.add('hidden'), 250);
    return;
  }
  el.classList.add('hidden');
};

const switchView = (view, { force = false } = {}) => {
  if (!force && dirty && view !== currentView) {
    pendingView = view;
    openModal('modalUnsaved');
    return;
  }

  const all = $$('.view-section');
  all.forEach((s) => {
    s.classList.add('view-hidden');
    s.classList.remove('view-active');
  });

  const target = document.querySelector(`section[data-view="${view}"]`);
  if (target) {
    target.classList.remove('view-hidden');
    target.classList.add('view-active');
    target.scrollTop = 0;
  }

  // Nav active state
  $$('.nav-item').forEach((b) => b.classList.remove('active-nav'));
  const navBtn = document.querySelector(`.nav-item[data-action="switch-view"][data-view="${view}"]`);
  if (navBtn) navBtn.classList.add('active-nav');

  currentView = view;
  try { location.hash = view; } catch {}
};

const cloneTpl = (id) => {
  const tpl = document.getElementById(id);
  if (!tpl) return null;
  return tpl.content.firstElementChild.cloneNode(true);
};

const renderPages = () => {
  const tbody = $('#pageListTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const q = safe($('#pageFilter')?.value).trim().toLowerCase();
  const rows = (state.pages || []).filter((p) => {
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
  });

  rows.forEach((p) => {
    const row = cloneTpl('tplPageRow');
    if (!row) return;
    row.dataset.id = p.id;
    row.querySelector('[data-field="name"]').textContent = p.name;
    row.querySelector('[data-field="slug"]').textContent = p.slug;
    tbody.appendChild(row);
  });
};

const renderBlocks = () => {
  const outline = $('#blockOutline');
  if (!outline) return;
  outline.innerHTML = '';

  const page = getPage();
  if (!page) return;

  (page.blocks || []).forEach((b) => {
    const item = cloneTpl('tplBlockItem');
    if (!item) return;
    item.dataset.id = b.id;
    item.querySelector('[data-field="type"]').textContent = b.type || 'Block';
    if (b.id === selectedBlockId) {
      item.classList.add('border-accent-gold/60');
      item.classList.remove('border-white/5');
    }
    outline.appendChild(item);
  });

  // Sortable (reorder blocks)
  if (window.Sortable && outline) {
    try {
      sortableOutline?.destroy?.();
    } catch {}
    sortableOutline = new window.Sortable(outline, {
      animation: 150,
      handle: '.fa-grip-vertical',
      onEnd: () => {
        const pageNow = getPage();
        if (!pageNow) return;
        const ids = $$('#blockOutline [data-id]').map((n) => n.dataset.id);
        const newOrder = ids.map((id) => (pageNow.blocks || []).find((b) => b.id === id)).filter(Boolean);
        pageNow.blocks = newOrder;
        pageNow.updatedAt = new Date().toISOString();
        setDirty(true);
        toast('Orden actualizado', 'Se reordenaron los bloques.', 'fa-grip-vertical');
        renderBlocks();
        renderCanvas();
      },
    });
  }
};

const renderCanvas = () => {
  const canvas = $('#canvas');
  if (!canvas) return;

  const page = getPage();
  if (!page) return;

  // Simple HTML preview (no backend, no tailwind inside canvas)
  const blocks = page.blocks || [];

  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 36px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-end; gap:16px; margin-bottom:24px;">
        <div>
          <div style="font-size:12px; letter-spacing:.18em; text-transform:uppercase; color:#666;">Preview</div>
          <h1 style="margin:0; font-size:28px; color:#111;">${safe(page.name)} <span style="font-size:14px; color:#666; font-weight:600;">(${safe(page.slug)})</span></h1>
        </div>
        <div style="font-size:12px; color:#666; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">
          Updated: ${fmtDate(page.updatedAt)}
        </div>
      </div>

      ${blocks.map((b) => {
        const img = b.imageId ? getMedia(b.imageId) : null;
        const doc = b.docId ? getDoc(b.docId) : null;
        return `
          <div style="border:1px solid #eee; border-radius:14px; padding:18px; margin-bottom:14px; background:#fff;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
              <div style="font-size:12px; color:#666; font-weight:700; letter-spacing:.12em; text-transform:uppercase;">
                ${safe(b.type)}
              </div>
              <div style="font-size:12px; color:#999; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">
                ${safe(b.id)}
              </div>
            </div>
            <div style="margin-top:10px; font-size:18px; font-weight:800; color:#111;">${safe(b.title)}</div>
            <div style="margin-top:4px; font-size:13px; color:#666; font-weight:600;">${safe(b.subtitle)}</div>
            <div style="margin-top:10px; font-size:13px; color:#333; line-height:1.45;">${safe(b.body)}</div>

            ${(img || doc) ? `
              <div style="margin-top:14px; display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                ${img ? `<span style="display:inline-flex; align-items:center; gap:8px; padding:8px 10px; border:1px solid #eee; border-radius:999px; font-size:12px; color:#333;">
                  <span style="width:10px; height:10px; background:#facc15; border-radius:999px;"></span>
                  Media: ${safe(img.name)}
                </span>` : ''}
                ${doc ? `<span style="display:inline-flex; align-items:center; gap:8px; padding:8px 10px; border:1px solid #eee; border-radius:999px; font-size:12px; color:#333;">
                  <span style="width:10px; height:10px; background:#111; border-radius:999px;"></span>
                  Doc: ${safe(doc.title)}
                </span>` : ''}
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;

  canvas.innerHTML = html;
};

const renderProps = () => {
  const body = $('#propBody');
  if (!body) return;

  const page = getPage();
  const block = getBlock(page, selectedBlockId);
  if (!page || !block) {
    body.innerHTML = `<p class="text-xs text-gray-600 text-center mt-20">Selecciona un bloque para ver sus propiedades.</p>`;
    blockDraft = null;
    return;
  }

  blockDraft = { ...block };

  const media = blockDraft.imageId ? getMedia(blockDraft.imageId) : null;
  const doc = blockDraft.docId ? getDoc(blockDraft.docId) : null;

  body.innerHTML = `
    <div class="space-y-6">
      <div class="space-y-2">
        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tipo</label>
        <select class="w-full glass-input rounded-xl p-3 text-xs" data-prop="type">
          ${['Hero','Section','CTA','Gallery','Timeline','Text','Media'].map((t) => `<option ${t === blockDraft.type ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>

      <div class="space-y-2">
        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Título</label>
        <input class="w-full glass-input rounded-xl p-3 text-sm font-medium" data-prop="title" value="${safe(blockDraft.title)}"/>
      </div>

      <div class="space-y-2">
        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Subtítulo</label>
        <input class="w-full glass-input rounded-xl p-3 text-sm" data-prop="subtitle" value="${safe(blockDraft.subtitle)}"/>
      </div>

      <div class="space-y-2">
        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Contenido</label>
        <textarea rows="5" class="w-full glass-input rounded-xl p-3 text-sm" data-prop="body">${safe(blockDraft.body)}</textarea>
      </div>

      <div class="space-y-2">
        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Media</label>
        <div class="flex gap-2">
          <input class="flex-1 glass-input rounded-xl p-3 text-xs font-mono" value="${media ? safe(media.name) : '—'}" readonly>
          <button class="px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase border border-white/10"
            data-action="open-media-picker">Elegir</button>
          <button class="px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase border border-white/10"
            data-action="clear-media">X</button>
        </div>
      </div>

      <div class="space-y-2">
        <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Documento</label>
        <div class="flex gap-2">
          <input class="flex-1 glass-input rounded-xl p-3 text-xs font-mono" value="${doc ? safe(doc.title) : '—'}" readonly>
          <button class="px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase border border-white/10"
            data-action="open-doc-picker">Elegir</button>
          <button class="px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase border border-white/10"
            data-action="clear-doc">X</button>
        </div>
      </div>

      <div class="pt-2">
        <div class="text-[10px] text-gray-600 font-mono">ID: ${safe(blockDraft.id)}</div>
      </div>
    </div>
  `;
};

const renderNews = () => {
  const tbody = $('#newsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  (state.news || []).forEach((n) => {
    const row = cloneTpl('tplNewsRow');
    if (!row) return;
    row.dataset.id = n.id;
    row.querySelector('[data-field="title"]').textContent = n.title;
    row.querySelector('[data-field="date"]').textContent = n.date;
    row.querySelector('[data-field="status"]').textContent = n.status;
    tbody.appendChild(row);
  });
};

const renderMedia = () => {
  const grid = $('#mediaGrid');
  if (!grid) return;
  grid.innerHTML = '';

  (state.media || []).forEach((m) => {
    const card = cloneTpl('tplMediaCard');
    if (!card) return;
    card.dataset.id = m.id;
    card.querySelector('[data-field="preview"]').src = m.url;
    card.querySelector('[data-field="name"]').textContent = m.name;
    grid.appendChild(card);
  });
};

const renderDocs = () => {
  const tbody = $('#docsTableBody');
  const pickerBody = $('#pdfPickerTableBody');
  if (tbody) tbody.innerHTML = '';
  if (pickerBody) pickerBody.innerHTML = '';

  (state.docs || []).forEach((d) => {
    const row1 = cloneTpl('tplDocRow');
    if (row1 && tbody) {
      row1.dataset.id = d.id;
      row1.querySelector('[data-field="title"]').textContent = d.title;
      row1.querySelector('[data-field="category"]').textContent = d.category;
      row1.querySelector('[data-field="date"]').textContent = d.date;
      tbody.appendChild(row1);
    }

    const row2 = cloneTpl('tplDocRow');
    if (row2 && pickerBody) {
      row2.dataset.id = d.id;
      row2.querySelector('[data-field="title"]').textContent = d.title;
      row2.querySelector('[data-field="category"]').textContent = d.category;
      row2.querySelector('[data-field="date"]').textContent = d.date;
      pickerBody.appendChild(row2);
    }
  });
};

const renderSeo = () => {
  const st = $('#seoSiteTitle');
  const sd = $('#seoSiteDescription');
  if (st) st.value = safe(state.seo?.siteTitle);
  if (sd) sd.value = safe(state.seo?.siteDescription);

  const sel = $('#seoPageSelect');
  const pt = $('#seoPageTitle');
  if (sel && pt) {
    const key = sel.value;
    pt.value = safe(state.seo?.perPage?.[key]?.title);
  }
};

const renderMediaPicker = () => {
  const grid = $('#mediaPickerGrid');
  if (!grid) return;
  grid.innerHTML = '';

  (state.media || []).forEach((m) => {
    const card = cloneTpl('tplMediaCard');
    if (!card) return;
    card.dataset.id = m.id;
    card.querySelector('[data-field="preview"]').src = m.url;
    card.querySelector('[data-field="name"]').textContent = m.name;
    grid.appendChild(card);
  });
};

const renderAll = () => {
  renderPages();
  renderBlocks();
  renderProps();
  renderCanvas();
  renderNews();
  renderMedia();
  renderDocs();
  renderSeo();

  const last = $('#lastDeployLabel');
  if (last) {
    last.textContent = `${state.version || 'v0.0.0'} • ${fmtDate(state.lastDeployAt)}`;
  }
};

const ensureSelection = () => {
  const page = getPage();
  if (!page && state.pages?.length) {
    selectedPageId = state.pages[0].id;
  }
};

const openNewsEditor = (id) => {
  const panel = $('#newsEditor');
  const wrap = $('#newsEditor .glass-panel');
  if (!panel || !wrap) return;

  const item = state.news.find((n) => n.id === id);
  if (!item) return;

  panel.classList.remove('hidden');

  wrap.innerHTML = `
    <div class="flex items-center justify-between gap-4 mb-6">
      <div>
        <h3 class="text-xl font-bold text-white">Editor de Noticia</h3>
        <p class="text-xs text-gray-500 mt-1">Demo local (sin backend). Guardado en localStorage.</p>
      </div>
      <button class="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white"
        data-action="close-news-editor"><i class="fa-solid fa-xmark"></i></button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="md:col-span-2 space-y-5">
        <div class="space-y-2">
          <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Título</label>
          <input class="w-full glass-input rounded-xl p-4 text-sm font-medium" data-news="title" value="${safe(item.title)}"/>
        </div>

        <div class="space-y-2">
          <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Extracto</label>
          <textarea rows="3" class="w-full glass-input rounded-xl p-4 text-sm" data-news="excerpt">${safe(item.excerpt || '')}</textarea>
        </div>

        <div class="space-y-2">
          <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Cuerpo</label>
          <textarea rows="10" class="w-full glass-input rounded-xl p-4 text-sm" data-news="body">${safe(item.body || '')}</textarea>
        </div>
      </div>

      <div class="space-y-5">
        <div class="space-y-2">
          <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Fecha</label>
          <input class="w-full glass-input rounded-xl p-4 text-sm font-mono" data-news="date" value="${safe(item.date)}"/>
        </div>

        <div class="space-y-2">
          <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Estado</label>
          <select class="w-full glass-input rounded-xl p-4 text-sm" data-news="status">
            <option ${item.status === 'DRAFT' ? 'selected' : ''}>DRAFT</option>
            <option ${item.status === 'PUBLISHED' ? 'selected' : ''
