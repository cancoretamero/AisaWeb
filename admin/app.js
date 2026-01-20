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
  const now = new Date().toISOString();

  const media = [
    { id: 'm1', name: 'ship-01.jpg', url: 'https://source.unsplash.com/800x800/?ship,ocean', createdAt: now },
    { id: 'm2', name: 'gold-01.jpg', url: 'https://source.unsplash.com/800x800/?gold,bar', createdAt: now },
    { id: 'm3', name: 'office-01.jpg', url: 'https://source.unsplash.com/800x800/?office,building', createdAt: now },
    { id: 'm4', name: 'mine-01.jpg', url: 'https://source.unsplash.com/800x800/?mine,industry', createdAt: now },
    { id: 'm5', name: 'solar-01.jpg', url: 'https://source.unsplash.com/800x800/?solar,panels', createdAt: now },
    { id: 'm6', name: 'fish-01.jpg', url: 'https://source.unsplash.com/800x800/?fishing,boat', createdAt: now },
    { id: 'm7', name: 'map-01.jpg', url: 'https://source.unsplash.com/800x800/?map,world', createdAt: now },
    { id: 'm8', name: 'port-01.jpg', url: 'https://source.unsplash.com/800x800/?port,container', createdAt: now },
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
      updatedAt: now,
      blocks: [
        { id: 'b_h1', type: 'Hero', title: 'AISA Group', subtitle: 'Global Investment Holdings', body: 'Vista previa de hero.', imageId: 'm2', docId: null },
        { id: 'b_h2', type: 'Section', title: 'Mining & Energy', subtitle: 'Sostenibilidad', body: 'Sección demo.', imageId: 'm5', docId: 'd3' },
        { id: 'b_h3', type: 'CTA', title: 'Contact', subtitle: 'Let’s talk', body: 'Call to action demo.', imageId: 'm3', docId: null },
      ],
    },
    {
      id: 'p_about',
      name: 'Nosotros',
      slug: '/about.html',
      updatedAt: now,
      blocks: [
        { id: 'b_a1', type: 'Hero', title: 'Quiénes Somos', subtitle: 'AISA', body: 'Bloque demo.', imageId: 'm3', docId: null },
        { id: 'b_a2', type: 'Timeline', title: 'Historia', subtitle: 'Evolución', body: 'Timeline demo.', imageId: 'm7', docId: 'd2' },
      ],
    },
    {
      id: 'p_cabo',
      name: 'Cabo Vírgenes',
      slug: '/cabo-virgenes.html',
      updatedAt: now,
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
    lastDeployAt: now,
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
let pickerContext = null; // { kind: 'media'|'doc', onPick: (id)=>void }

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
  if (el.classList.contains('opacity-0')) requestAnimationFrame(() => el.classList.remove('opacity-0'));
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

const cloneTpl = (id) => {
  const tpl = document.getElementById(id);
  if (!tpl) return null;
  return tpl.content.firstElementChild.cloneNode(true);
};

const ensureSelection = () => {
  if (!selectedPageId && state.pages?.length) selectedPageId = state.pages[0].id;
  if (!selectedPageId) return;
  const page = getPage();
  if (!page && state.pages?.length) selectedPageId = state.pages[0].id;
};

const setCurrentPageLabel = () => {
  const lbl = $('#currentPageLabel');
  const page = getPage();
  if (lbl && page) lbl.textContent = page.name;
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

  $$('.nav-item').forEach((b) => b.classList.remove('active-nav'));
  const navBtn = document.querySelector(`.nav-item[data-action="switch-view"][data-view="${view}"]`);
  if (navBtn) navBtn.classList.add('active-nav');

  currentView = view;
  try { location.hash = view; } catch {}

  // view-specific refresh
  if (view === 'pages') setCurrentPageLabel();
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

  if (window.Sortable && outline) {
    try { sortableOutline?.destroy?.(); } catch {}
    sortableOutline = new window.Sortable(outline, {
      animation: 150,
      handle: '.fa-grip-vertical',
      onEnd: () => {
        const pageNow = getPage();
        if (!pageNow) return;
        const ids = $$('#blockOutline [data-id]').map((n) => n.dataset.id);
        const newOrder = ids
          .map((id) => (pageNow.blocks || []).find((b) => b.id === id))
          .filter(Boolean);

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
  ensureSelection();
  renderPages();
  renderBlocks();
  renderProps();
  renderCanvas();
  renderNews();
  renderMedia();
  renderDocs();
  renderSeo();
  setCurrentPageLabel();

  const last = $('#lastDeployLabel');
  if (last) last.textContent = `${state.version || 'v0.0.0'} • ${fmtDate(state.lastDeployAt)}`;
};

const persist = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setDirty(false);
    toast('Guardado', 'Estado guardado en localStorage.', 'fa-floppy-disk');
  } catch {
    toast('Error', 'No se pudo guardar en localStorage.', 'fa-triangle-exclamation');
  }
};

const initAuth = () => {
  const authed = localStorage.getItem(AUTH_KEY) === '1';
  if (!authed) openModal('modalAuth');
};

const applyAuth = () => {
  localStorage.setItem(AUTH_KEY, '1');
  closeModal('modalAuth');
  toast('Acceso', 'Sesión iniciada (demo).', 'fa-circle-check');
};

const openDocPicker = (onPick) => {
  pickerContext = { kind: 'doc', onPick };
  renderDocs();
  openModal('pdfPickerModal');
};

const openMediaPicker = (onPick) => {
  pickerContext = { kind: 'media', onPick };
  renderMediaPicker();
  openModal('mediaPickerModal');
};

const handleFileUpload = async (files) => {
  if (!files || !files.length) return;
  showLoading(true);

  const addImage = (name, url) => {
    state.media.unshift({ id: uid('m'), name, url, createdAt: new Date().toISOString() });
  };

  const addDoc = (title, url) => {
    state.docs.unshift({
      id: uid('d'),
      title,
      category: 'Uploads',
      date: fmtDate(new Date().toISOString()),
      url,
    });
  };

  const toDataURL = (file) =>
    new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.readAsDataURL(file);
    });

  for (const f of files) {
    const type = (f.type || '').toLowerCase();
    const name = f.name || 'file';

    if (type.startsWith('image/')) {
      const dataUrl = await toDataURL(f);
      addImage(name, dataUrl || URL.createObjectURL(f));
    } else if (type.includes('pdf') || type.includes('officedocument') || type.includes('msword')) {
      addDoc(name, URL.createObjectURL(f));
    } else {
      addImage(name, URL.createObjectURL(f));
    }
  }

  setDirty(true);
  showLoading(false);
  renderMedia();
  renderDocs();
  toast('Uploads', 'Archivos importados (demo local).', 'fa-cloud-arrow-up');
};

const initUploads = () => {
  const mediaDZ = $('#mediaUploadDropzone');
  const mediaInput = $('#mediaUploadDropzone input[type="file"]');
  if (mediaDZ && mediaInput) {
    mediaDZ.addEventListener('click', () => mediaInput.click());
    mediaInput.addEventListener('change', async () => {
      await handleFileUpload(Array.from(mediaInput.files || []));
      mediaInput.value = '';
    });
  }

  const docsDZ = $('#docsUploadDropzone');
  const docsInput = $('#docsUploadDropzone input[type="file"]');
  if (docsDZ && docsInput) {
    docsDZ.addEventListener('click', () => docsInput.click());
    docsInput.addEventListener('change', async () => {
      await handleFileUpload(Array.from(docsInput.files || []));
      docsInput.value = '';
    });
  }

  const btnUploadDocs = $('#btnUploadDocs');
  if (btnUploadDocs && docsInput) btnUploadDocs.addEventListener('click', () => docsInput.click());
};

const buildFuse = () => {
  if (!window.Fuse) return null;

  const docs = [];
  (state.pages || []).forEach((p) => docs.push({ kind: 'page', id: p.id, label: p.name, slug: p.slug, view: 'pages' }));
  (state.news || []).forEach((n) => docs.push({ kind: 'news', id: n.id, label: n.title, status: n.status, view: 'news' }));
  (state.media || []).forEach((m) => docs.push({ kind: 'media', id: m.id, label: m.name, view: 'media' }));
  (state.docs || []).forEach((d) => docs.push({ kind: 'doc', id: d.id, label: d.title, category: d.category, view: 'docs' }));

  return new window.Fuse(docs, { includeScore: true, threshold: 0.35, keys: ['label', 'slug', 'category', 'status'] });
};

const runGlobalSearch = () => {
  const input = $('#globalSearch');
  const q = safe(input?.value).trim();
  if (!q) return;

  const fuse = buildFuse();
  if (!fuse) {
    toast('Búsqueda', 'Fuse.js no disponible.', 'fa-triangle-exclamation');
    return;
  }

  const results = fuse.search(q).slice(0, 8).map((r) => r.item);
  if (!results.length) {
    toast('Búsqueda', 'Sin resultados.', 'fa-magnifying-glass');
    return;
  }

  const top = results[0];
  switchView(top.view, { force: true });

  if (top.kind === 'page') {
    selectedPageId = top.id;
    selectedBlockId = null;
    setCurrentPageLabel();
    renderPages();
    renderBlocks();
    renderProps();
    renderCanvas();
  }

  if (top.kind === 'news') {
    openNewsEditor(top.id);
  }

  toast('Búsqueda', `Abierto: ${top.label} (${results.length} resultados)`, 'fa-magnifying-glass');
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
            <option ${item.status === 'PUBLISHED' ? 'selected' : ''}>PUBLISHED</option>
          </select>
        </div>

        <div class="pt-2 space-y-3">
          <button class="w-full py-3 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl uppercase border border-white/10"
            data-action="save-news" data-id="${item.id}">
            <i class="fa-regular fa-floppy-disk mr-2"></i>Guardar
          </button>

          <button class="w-full py-3 bg-accent-gold text-black text-xs font-bold rounded-xl uppercase hover:bg-white transition-colors shadow-lg"
            data-action="publish-news" data-id="${item.id}">
            <i class="fa-solid fa-rocket mr-2"></i>Publicar
          </button>
        </div>

        <div class="text-[10px] text-gray-600 font-mono pt-2">ID: ${safe(item.id)}</div>
      </div>
    </div>
  `;
};

const initTopbarButtons = () => {
  $('#btnSaveDraft')?.addEventListener('click', () => persist());

  $('#btnPreview')?.addEventListener('click', () => {
    const page = getPage();
    if (!page) return toast('Preview', 'Selecciona una página.', 'fa-eye');

    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) return toast('Preview', 'El navegador bloqueó el popup.', 'fa-triangle-exclamation');

    const blocks = page.blocks || [];
    const doc = `
      <!doctype html><html><head><meta charset="utf-8"><title>Preview • ${safe(page.name)}</title></head>
      <body style="margin:0; background:#0b0b0b; color:#fff; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;">
        <div style="max-width:900px; margin:0 auto; padding:28px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-end; gap:12px; margin-bottom:18px;">
            <div>
              <div style="font-size:12px; letter-spacing:.22em; text-transform:uppercase; color:#9aa;">AISA Preview</div>
              <div style="font-size:26px; font-weight:800;">${safe(page.name)} <span style="font-size:12px; color:#9aa; font-weight:700;">${safe(page.slug)}</span></div>
            </div>
            <div style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size:12px; color:#9aa;">${fmtDate(page.updatedAt)}</div>
          </div>
          ${blocks.map((b) => `
            <div style="background:#111; border:1px solid rgba(255,255,255,.08); border-radius:14px; padding:16px; margin-bottom:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                <div style="font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:#facc15; font-weight:800;">${safe(b.type)}</div>
                <div style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size:11px; color:#7c7c7c;">${safe(b.id)}</div>
              </div>
              <div style="font-size:18px; font-weight:800; margin-top:8px;">${safe(b.title)}</div>
              <div style="font-size:13px; color:#bdbdbd; font-weight:600; margin-top:4px;">${safe(b.subtitle)}</div>
              <div style="font-size:13px; color:#e7e7e7; margin-top:10px; line-height:1.5;">${safe(b.body)}</div>
            </div>
          `).join('')}
        </div>
      </body></html>
    `;
    w.document.open();
    w.document.write(doc);
    w.document.close();
  });

  $('#btnPublish')?.addEventListener('click', () => openModal('modalConfirmPublish'));

  $('#btnConfirmPublish')?.addEventListener('click', () => {
    closeModal('modalConfirmPublish');
    showLoading(true);

    setTimeout(() => {
      state.lastDeployAt = new Date().toISOString();
      // no tocamos el versionado automático: mantenemos lo que haya
      setDirty(false);
      showLoading(false);
      toast('Despliegue', 'Sitio actualizado (demo).', 'fa-rocket');
      const last = $('#lastDeployLabel');
      if (last) last.textContent = `${state.version || 'v0.0.0'} • ${fmtDate(state.lastDeployAt)}`;
    }, 600);
  });
};

const applyBlockDraft = () => {
  const page = getPage();
  if (!page || !blockDraft) return;

  // validate
  if (validateBlock && !validateBlock(blockDraft)) {
    toast('Validación', 'El bloque no es válido (schema).', 'fa-triangle-exclamation');
    return;
  }

  const idx = (page.blocks || []).findIndex((b) => b.id === blockDraft.id);
  if (idx === -1) return;

  page.blocks[idx] = { ...blockDraft };
  page.updatedAt = new Date().toISOString();

  setDirty(true);
  toast('Bloque', 'Cambios aplicados.', 'fa-circle-check');

  renderBlocks();
  renderProps();
  renderCanvas();
};

const revertBlockDraft = () => {
  const page = getPage();
  const b = getBlock(page, selectedBlockId);
  if (!page || !b) return;

  blockDraft = { ...b };
  toast('Bloque', 'Cambios revertidos.', 'fa-rotate-left');
  renderProps();
  renderCanvas();
};

const initEditors = () => {
  // Apply/Revert buttons
  $('#btnApplyBlock')?.addEventListener('click', () => applyBlockDraft());
  $('#btnRevertBlock')?.addEventListener('click', () => revertBlockDraft());

  // Live update blockDraft as user types
  $('#propBody')?.addEventListener('input', (e) => {
    const el = e.target;
    if (!blockDraft) return;
    const k = el?.dataset?.prop;
    if (!k) return;

    blockDraft[k] = el.value;
    // preview live (no cambia el estado real hasta Apply)
    renderCanvas();
  });

  // SEO inputs
  $('#seoSiteTitle')?.addEventListener('input', (e) => {
    state.seo = state.seo || {};
    state.seo.siteTitle = e.target.value;
    setDirty(true);
  });
  $('#seoSiteDescription')?.addEventListener('input', (e) => {
    state.seo = state.seo || {};
    state.seo.siteDescription = e.target.value;
    setDirty(true);
  });
  $('#seoPageSelect')?.addEventListener('change', () => {
    renderSeo();
  });
  $('#seoPageTitle')?.addEventListener('input', (e) => {
    state.seo = state.seo || {};
    state.seo.perPage = state.seo.perPage || {};
    const key = $('#seoPageSelect')?.value;
    if (!key) return;
    state.seo.perPage[key] = state.seo.perPage[key] || {};
    state.seo.perPage[key].title = e.target.value;
    setDirty(true);
  });

  // Pages filter
  $('#pageFilter')?.addEventListener('input', () => renderPages());
};

const initUnsavedModal = () => {
  $('#btnStay')?.addEventListener('click', () => {
    pendingView = null;
    closeModal('modalUnsaved');
  });

  $('#btnLeave')?.addEventListener('click', () => {
    const v = pendingView;
    pendingView = null;
    closeModal('modalUnsaved');
    if (v) switchView(v, { force: true });
  });

  window.addEventListener('beforeunload', (e) => {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });
};

const initSearch = () => {
  const input = $('#globalSearch');
  if (!input) return;

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runGlobalSearch();
  });

  document.addEventListener('keydown', (e) => {
    const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const cmdK = (isMac && e.metaKey && e.key.toLowerCase() === 'k') || (!isMac && e.ctrlKey && e.key.toLowerCase() === 'k');
    if (cmdK) {
      e.preventDefault();
      input.focus();
      input.select?.();
    }

    if (e.key === 'Escape') {
      // close pickers if open
      if (!$('#mediaPickerModal')?.classList.contains('hidden')) closeModal('mediaPickerModal');
      if (!$('#pdfPickerModal')?.classList.contains('hidden')) closeModal('pdfPickerModal');
      if (!$('#modalConfirmPublish')?.classList.contains('hidden')) closeModal('modalConfirmPublish');
      if (!$('#modalUnsaved')?.classList.contains('hidden')) closeModal('modalUnsaved');
    }
  });
};

const initNews = () => {
  $('#btnNewNews')?.addEventListener('click', () => {
    const n = {
      id: uid('n'),
      title: 'Nueva Noticia',
      date: fmtDate(new Date().toISOString()),
      status: 'DRAFT',
      excerpt: '',
      body: '',
    };
    state.news.unshift(n);
    setDirty(true);
    renderNews();
    openNewsEditor(n.id);
    toast('Noticias', 'Nueva noticia creada (demo).', 'fa-plus');
  });
};

const initDelegatedHandlers = () => {
  document.addEventListener('click', (e) => {
    const act = e.target?.closest?.('[data-action]');
    if (!act) return;

    const action = act.dataset.action;

    if (action === 'switch-view') {
      const view = act.dataset.view;
      if (view) switchView(view);
      return;
    }

    if (action === 'close-modal') {
      const target = act.dataset.target;
      if (target) closeModal(target);
      return;
    }

    if (action === 'open-media-picker') {
      if (!blockDraft) return;
      openMediaPicker((mediaId) => {
        if (!blockDraft) return;
        blockDraft.imageId = mediaId;
        renderProps();
        renderCanvas();
      });
      return;
    }

    if (action === 'open-doc-picker') {
      if (!blockDraft) return;
      openDocPicker((docId) => {
        if (!blockDraft) return;
        blockDraft.docId = docId;
        renderProps();
        renderCanvas();
      });
      return;
    }

    if (action === 'clear-media') {
      if (!blockDraft) return;
      blockDraft.imageId = null;
      renderProps();
      renderCanvas();
      return;
    }

    if (action === 'clear-doc') {
      if (!blockDraft) return;
      blockDraft.docId = null;
      renderProps();
      renderCanvas();
      return;
    }

    if (action === 'pick-doc') {
      const tr = act.closest('tr[data-id]');
      const id = tr?.dataset?.id;
      if (!id) return;

      const doc = getDoc(id);
      if (!doc) return;

      // if picker open, assign to blockDraft
      if (!$('#pdfPickerModal')?.classList.contains('hidden') && pickerContext?.kind === 'doc') {
        pickerContext.onPick(id);
        pickerContext = null;
        closeModal('pdfPickerModal');
        toast('Documento', 'Documento asignado al bloque.', 'fa-link');
        return;
      }

      // default: open doc
      window.open(doc.url, '_blank', 'noopener,noreferrer');
      toast('Documento', 'Abriendo documento.', 'fa-file-pdf');
      return;
    }

    if (action === 'edit-news') {
      const tr = act.closest('tr[data-id]');
      const id = tr?.dataset?.id;
      if (id) openNewsEditor(id);
      return;
    }

    if (action === 'close-news-editor') {
      $('#newsEditor')?.classList.add('hidden');
      return;
    }

    if (action === 'save-news' || action === 'publish-news') {
      const id = act.dataset.id;
      const wrap = $('#newsEditor .glass-panel');
      if (!id || !wrap) return;

      const item = state.news.find((n) => n.id === id);
      if (!item) return;

      const fields = $$('[data-news]', wrap);
      fields.forEach((el) => {
        const k = el.dataset.news;
        item[k] = el.value;
      });

      if (action === 'publish-news') item.status = 'PUBLISHED';

      setDirty(true);
      renderNews();
      toast('Noticias', action === 'publish-news' ? 'Noticia publicada (demo).' : 'Noticia guardada (demo).', 'fa-pen-nib');
      return;
    }
  });

  // non-data-action selection handlers
  document.addEventListener('click', (e) => {
    // Page select
    const tr = e.target.closest('#pageListTableBody tr[data-id]');
    if (tr) {
      selectedPageId = tr.dataset.id;
      selectedBlockId = null;
      setCurrentPageLabel();
      renderPages();
      renderBlocks();
      renderProps();
      renderCanvas();
      return;
    }

    // Block select
    const bi = e.target.closest('#blockOutline [data-id]');
    if (bi) {
      selectedBlockId = bi.dataset.id;
      renderBlocks();
      renderProps();
      renderCanvas();
      return;
    }

    // Media grid card open
    const card = e.target.closest('#mediaGrid [data-id]');
    if (card) {
      const m = getMedia(card.dataset.id);
      if (m?.url) window.open(m.url, '_blank', 'noopener,noreferrer');
      return;
    }

    // Media picker selection
    const mpCard = e.target.closest('#mediaPickerGrid [data-id]');
    if (mpCard && pickerContext?.kind === 'media' && !$('#mediaPickerModal')?.classList.contains('hidden')) {
      const mid = mpCard.dataset.id;
      pickerContext.onPick(mid);
      pickerContext = null;
      closeModal('mediaPickerModal');
      toast('Media', 'Media asignado al bloque.', 'fa-images');
      return;
    }
  });
};

const initAuthForm = () => {
  $('#authForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = safe($('#authEmail')?.value).trim();
    const pass = safe($('#authPassword')?.value).trim();

    if (!email || !pass) {
      toast('Auth', 'Completa email y password.', 'fa-triangle-exclamation');
      return;
    }
    applyAuth();
  });
};

const initHashRouting = () => {
  const hash = safe(location.hash || '').replace('#', '').trim();
  if (hash) currentView = hash;
  switchView(currentView, { force: true });
};

const init = () => {
  // state sanity
  ensureSelection();

  // auth
  initAuth();
  initAuthForm();

  // core UI wiring
  renderAll();
  initHashRouting();

  initTopbarButtons();
  initUploads();
  initEditors();
  initUnsavedModal();
  initSearch();
  initNews();
  initDelegatedHandlers();

  // default page label
  setCurrentPageLabel();

  // auth modal click outside (only if overlay click has no data-action)
  // already handled by data-action close-modal in the modal markup where needed

  toast('Studio', 'Panel cargado (demo).', 'fa-circle-check');
};

init();
