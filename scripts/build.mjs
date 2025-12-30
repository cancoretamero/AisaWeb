// scripts/build.mjs
// AISA Build Pipeline (fase 1: copia segura a /dist)
//
// Objetivo ahora: NO cambiar tu web pública.
// Este script solo genera /dist replicando el sitio actual.
//
// Objetivo próximo: usar este mismo script para inyectar contenido editable
// (p.ej. data/content.json) en los HTML al publicar.
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
    // Symlinks/others: no se esperan en este repo; ignoramos por seguridad
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
