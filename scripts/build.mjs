// scripts/build.mjs
// AISA Build Pipeline (fase 1: copia segura a /dist)
// + Inyección automática del theme toggle (dark/light) en todas las páginas públicas (.html)
//
// Objetivo: NO tocar tu web página por página.
// Este script genera /dist replicando el sitio actual e inyectando, al build time,
// los assets y el script necesarios para el botón de modo claro/oscuro.
//
// Requisitos: Node >= 18 (ya lo indicas en package.json)

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");

/**
 * Carpetas que SÍ publicamos.
 * (no incluimos /netlify por higiene; las funciones ya las gestiona Netlify)
 */
const DIRS_TO_COPY = [
  "css",
  "js",
  "images",
  "videos",
  "console",
  "data" // la usaremos para content.json más adelante
];

/**
 * Ficheros “sueltos” de root que queremos publicar.
 * Incluye páginas .html y algunos ficheros típicos.
 */
const ROOT_FILE_ALLOWLIST = new Set([
  "CNAME",
  "robots.txt",
  "sitemap.xml",
  "sitemap.txt",
  "favicon.ico",
  "favicon.svg",
  "site.webmanifest",
  "manifest.webmanifest",
  "_redirects",
  "_headers"
]);

const EXT_ALLOWLIST = new Set([
  ".html",
  ".txt",
  ".xml",
  ".ico",
  ".svg",
  ".webmanifest"
]);

// ------------------------------------------------------------
// Theme toggle injection (public pages only)
// ------------------------------------------------------------
const THEME_MARKER = "AISA_THEME_TOGGLE_INJECTED";

function normalizePath(p) {
  return p.split(path.sep).join("/");
}

function isConsoleHtml(srcPath) {
  const n = normalizePath(srcPath);
  return n.includes("/console/") && n.toLowerCase().endsWith(".html");
}

function stripHtmlDarkClass(html) {
  return html.replace(
    /<html\b([^>]*?)class=(['"])([^'"]*)(\2)([^>]*)>/i,
    (match, pre, q, cls, _q2, post) => {
      const cleaned = cls
        .split(/\s+/)
        .filter((c) => c && c !== "dark")
        .join(" ");
      return `<html${pre}class=${q}${cleaned}${q}${post}>`;
    }
  );
}

function injectThemeToggle(html, srcPath) {
  // Por seguridad, NO inyectamos en /console (admin) por defecto.
  // Si también lo quieres en la consola, elimina este guard.
  if (isConsoleHtml(srcPath)) {
    return html;
  }

  // Idempotente: evita doble inyección
  if (
    html.includes(THEME_MARKER) ||
    html.includes("/js/theme-toggle.js") ||
    html.includes("/css/theme-toggle.css")
  ) {
    return stripHtmlDarkClass(html);
  }

  let out = stripHtmlDarkClass(html);

  // Script ultra temprano para evitar “flash” de tema incorrecto
  const earlyInit = `
<script>
  (function () {
    try {
      var html = document.documentElement;
      var stored = null;
      try { stored = localStorage.getItem('theme'); } catch (e) {}
      var prefersDark = false;
      try { prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) {}
      if (stored === 'dark' || (!stored && prefersDark)) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    } catch (e) {}
  })();
</script>
`.trim();

  const headInject = `
<!-- ${THEME_MARKER} -->
<meta name="color-scheme" content="light dark">
<link rel="stylesheet" href="/css/theme-toggle.css">
<script src="/js/theme-toggle.js" defer></script>
`.trim();

  // 1) Early init justo después de <head ...>
  out = out.replace(/<head\b([^>]*)>/i, (m, attrs) => `<head${attrs}>\n${earlyInit}\n`);

  // 2) Assets + lógica defer justo antes de </head>
  out = out.replace(/<\/head>/i, `\n${headInject}\n</head>`);

  return out;
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function copyFile(src, dst) {
  await ensureDir(path.dirname(dst));

  const ext = path.extname(src).toLowerCase();

  // HTML se procesa (inyección del toggle)
  if (ext === ".html") {
    const raw = await fs.readFile(src, "utf8");
    const transformed = injectThemeToggle(raw, src);
    await fs.writeFile(dst, transformed, "utf8");
    return;
  }

  // El resto se copia byte-a-byte
  await fs.copyFile(src, dst);
}

async function copyDir(srcDir, dstDir) {
  await ensureDir(dstDir);

  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  for (const ent of entries) {
    const src = path.join(srcDir, ent.name);
    const dst = path.join(dstDir, ent.name);

    if (ent.isDirectory()) {
      await copyDir(src, dst);
    } else if (ent.isFile()) {
      await copyFile(src, dst);
    }
    // Symlinks/otros: no se esperan; ignoramos por seguridad
  }
}

async function copyRootFiles() {
  const entries = await fs.readdir(ROOT, { withFileTypes: true });

  for (const ent of entries) {
    if (!ent.isFile()) continue;

    const name = ent.name;

    // Nunca copiamos cosas de build/dev
    if (name === "package.json" || name === "package-lock.json" || name === "netlify.toml") continue;

    // allowlist por nombre
    if (ROOT_FILE_ALLOWLIST.has(name)) {
      await copyFile(path.join(ROOT, name), path.join(DIST, name));
      continue;
    }

    // allowlist por extensión (ej: index.html, sostenibilidad.html, etc.)
    const ext = path.extname(name).toLowerCase();
    if (EXT_ALLOWLIST.has(ext)) {
      await copyFile(path.join(ROOT, name), path.join(DIST, name));
    }
  }
}

async function main() {
  const started = Date.now();

  // reset dist
  await fs.rm(DIST, { recursive: true, force: true });
  await ensureDir(DIST);

  // Copy root files (html + basics)
  await copyRootFiles();

  // Copy selected dirs
  for (const dir of DIRS_TO_COPY) {
    const srcDir = path.join(ROOT, dir);
    if (await exists(srcDir)) {
      await copyDir(srcDir, path.join(DIST, dir));
    }
  }

  const ms = Date.now() - started;
  console.log(`[AISA build] dist/ generado OK en ${ms}ms`);
}

main().catch((err) => {
  console.error("[AISA build] ERROR:", err);
  process.exit(1);
});
