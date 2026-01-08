import { chromium } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import http from 'http';
import { spawn } from 'child_process';

const args = new Set(process.argv.slice(2));
const mode = args.has('--mode=baseline') ? 'baseline' : 'diff';
const rootDir = process.cwd();
const baseUrl = 'http://localhost:4173';

const pages = [
  { name: 'index', path: '/index.html' },
  { name: 'nosotros', path: '/nosotros.html', lightPath: '/light-mode/quienessomos-light.html' },
  { name: 'quienes-somos', path: '/quienes-somos.html', lightPath: '/light-mode/quienessomos-light.html' },
  { name: 'equipo', path: '/equipo.html', lightPath: '/light-mode/equipo-light.html' },
  { name: 'unidades', path: '/unidades.html', lightPath: '/light-mode/unidades-light.html' },
  { name: 'sostenibilidad', path: '/sostenibilidad.html', lightPath: '/light-mode/sostenibilidad-light' },
  { name: 'prensa', path: '/prensa.html', lightPath: '/light-mode/prensa-light.html' },
  { name: 'carreras', path: '/carreras.html', lightPath: '/light-mode/carreras-light.html' },
  { name: 'utilidades', path: '/utilidades.html' }
];

const dirs = {
  dark: path.join(rootDir, 'baselines', 'dark'),
  light: path.join(rootDir, 'baselines', 'light'),
  artifacts: path.join(rootDir, 'artifacts')
};

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const waitForServer = async (timeoutMs = 5000) => {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(baseUrl, (res) => {
        res.resume();
        resolve(true);
      });
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error('Server did not start in time'));
          return;
        }
        setTimeout(attempt, 250);
      });
    };
    attempt();
  });
};

const startServer = async () => {
  const child = spawn('python3', ['-m', 'http.server', '4173'], {
    cwd: rootDir,
    stdio: 'ignore'
  });
  await waitForServer();
  return child;
};

const setupPage = async (page, theme) => {
  await page.addInitScript((themeValue) => {
    localStorage.setItem('theme', themeValue);
  }, theme);
  await page.addStyleTag({
    content: `
      * { animation: none !important; transition: none !important; caret-color: transparent !important; }
      #theme-toggle { visibility: hidden !important; }
      .animate-bounce { animation: none !important; }
      [data-aos] { animation: none !important; }
    `
  });
};

const takeScreenshot = async (browser, url, filePath) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await setupPage(page, url.theme);
  await page.goto(url.href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.screenshot({ path: filePath, fullPage: true });
  await page.close();
};

const loadPng = async (filePath) => {
  const data = await fs.readFile(filePath);
  return PNG.sync.read(data);
};

const savePng = async (png, filePath) => {
  const buffer = PNG.sync.write(png);
  await fs.writeFile(filePath, buffer);
};

const compareImages = async (baselinePath, actualPath, diffPath) => {
  const baseline = await loadPng(baselinePath);
  const actual = await loadPng(actualPath);
  const { width, height } = baseline;
  if (width !== actual.width || height !== actual.height) {
    return { mismatch: width * height, total: width * height, dimensionsMismatch: true };
  }
  const diff = new PNG({ width, height });
  const mismatch = pixelmatch(baseline.data, actual.data, diff.data, width, height, { threshold: 0.05 });
  await savePng(diff, diffPath);
  return { mismatch, total: width * height, dimensionsMismatch: false };
};

const run = async () => {
  await ensureDir(dirs.dark);
  await ensureDir(dirs.light);
  await ensureDir(dirs.artifacts);

  let server;
  try {
    await waitForServer(1500);
  } catch {
    server = await startServer();
  }

  const browser = await chromium.launch();
  let hasDiffs = false;

  for (const page of pages) {
    const darkTarget = path.join(dirs.dark, `${page.name}.png`);
    const lightTarget = path.join(dirs.light, `${page.name}.png`);

    if (mode === 'baseline') {
      await takeScreenshot(browser, { href: `${baseUrl}${page.path}`, theme: 'dark' }, darkTarget);
      if (page.lightPath) {
        await takeScreenshot(browser, { href: `${baseUrl}${page.lightPath}`, theme: 'light' }, lightTarget);
      }
      continue;
    }

    const darkActual = path.join(dirs.artifacts, `${page.name}.dark.actual.png`);
    await takeScreenshot(browser, { href: `${baseUrl}${page.path}`, theme: 'dark' }, darkActual);
    if (await exists(darkTarget)) {
      const diffPath = path.join(dirs.artifacts, `${page.name}.dark.diff.png`);
      const result = await compareImages(darkTarget, darkActual, diffPath);
      if (result.mismatch > 0) {
        hasDiffs = true;
        await fs.copyFile(darkTarget, path.join(dirs.artifacts, `${page.name}.dark.baseline.png`));
      } else {
        await fs.unlink(diffPath).catch(() => {});
      }
    }

    if (page.lightPath && await exists(lightTarget)) {
      const lightActual = path.join(dirs.artifacts, `${page.name}.light.actual.png`);
      await takeScreenshot(browser, { href: `${baseUrl}${page.path}`, theme: 'light' }, lightActual);
      const diffPath = path.join(dirs.artifacts, `${page.name}.light.diff.png`);
      const result = await compareImages(lightTarget, lightActual, diffPath);
      if (result.mismatch > 0) {
        hasDiffs = true;
        await fs.copyFile(lightTarget, path.join(dirs.artifacts, `${page.name}.light.baseline.png`));
      } else {
        await fs.unlink(diffPath).catch(() => {});
      }
    }
  }

  await browser.close();
  if (server) {
    server.kill('SIGTERM');
  }

  if (mode === 'diff' && hasDiffs) {
    console.error('Visual diffs detected. See artifacts/*.diff.png');
    process.exit(1);
  }
};

const exists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
