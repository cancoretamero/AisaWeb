import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const ROOT = process.cwd();
const BASELINES_DIR = path.join(ROOT, 'tests', 'visual', 'baselines');
const ARTIFACTS_DIR = path.join(ROOT, 'tests', 'visual', 'artifacts');
const PORT = 4173;
const SERVER_URL = `http://127.0.0.1:${PORT}`;

const pages = [
    { name: 'index', darkPath: '/index.html', lightPath: '/index.html' },
    { name: 'nosotros', darkPath: '/nosotros.html', lightPath: '/light-mode/quienessomos-light.html' },
    { name: 'quienes-somos', darkPath: '/quienes-somos.html', lightPath: '/light-mode/quienessomos-light.html' },
    { name: 'equipo', darkPath: '/equipo.html', lightPath: '/light-mode/equipo-light.html' },
    { name: 'unidades', darkPath: '/unidades.html', lightPath: '/light-mode/unidades-light.html' },
    { name: 'sostenibilidad', darkPath: '/sostenibilidad.html', lightPath: '/light-mode/sostenibilidad-light' },
    { name: 'prensa', darkPath: '/prensa.html', lightPath: '/light-mode/prensa-light.html' },
    { name: 'carreras', darkPath: '/carreras.html', lightPath: '/light-mode/carreras-light.html' },
    { name: 'utilidades', darkPath: '/utilidades.html', lightPath: '/utilidades.html' },
];

const updateBaselines = process.argv.includes('--update-baselines');

const waitForNetworkIdle = async (page) => {
    await page.waitForLoadState('networkidle');
    await page.evaluate(async () => {
        await document.fonts.ready;
    });
};

const disableAnimations = async (page) => {
    await page.addStyleTag({
        content: `* { transition: none !important; animation: none !important; }`,
    });
};

const takeScreenshot = async (page, filePath) => {
    await page.screenshot({ path: filePath, fullPage: true });
};

const compareScreenshots = (baselinePath, currentPath, diffPath) => {
    const img1 = PNG.sync.read(fs.readFileSync(baselinePath));
    const img2 = PNG.sync.read(fs.readFileSync(currentPath));
    const { width, height } = img1;
    const diff = new PNG({ width, height });
    const mismatch = pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold: 0.1 });
    if (mismatch > 0) {
        fs.writeFileSync(diffPath, PNG.sync.write(diff));
    }
    return mismatch;
};

const startServer = () => {
    const server = spawn('npx', ['http-server', ROOT, '-p', PORT, '-c-1', '--silent'], {
        stdio: 'inherit',
    });
    return server;
};

const run = async () => {
    const server = startServer();

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    let failures = 0;

    for (const entry of pages) {
        for (const mode of ['light', 'dark']) {
            const isDark = mode === 'dark';
            const targetPath = entry.darkPath;
            const baselinePath = path.join(BASELINES_DIR, mode, `${entry.name}.png`);
            const currentPath = path.join(ARTIFACTS_DIR, `${entry.name}-${mode}.png`);
            const diffPath = path.join(ARTIFACTS_DIR, `${entry.name}-${mode}-diff.png`);

            await page.addInitScript((theme) => {
                localStorage.theme = theme;
            }, isDark ? 'dark' : 'light');

            await page.goto(`${SERVER_URL}${targetPath}`, { waitUntil: 'domcontentloaded' });
            await disableAnimations(page);
            await waitForNetworkIdle(page);
            await takeScreenshot(page, currentPath);

            if (updateBaselines) {
                const baselineSource = mode === 'light' ? entry.lightPath : entry.darkPath;
                fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
                if (baselineSource !== targetPath) {
                    await page.goto(`${SERVER_URL}${baselineSource}`, { waitUntil: 'domcontentloaded' });
                    await disableAnimations(page);
                    await waitForNetworkIdle(page);
                    await takeScreenshot(page, baselinePath);
                } else {
                    fs.copyFileSync(currentPath, baselinePath);
                }
                continue;
            }

            if (!fs.existsSync(baselinePath)) {
                console.error(`Missing baseline: ${baselinePath}`);
                failures += 1;
                continue;
            }

            const mismatch = compareScreenshots(baselinePath, currentPath, diffPath);
            if (mismatch > 0) {
                console.error(`Visual diff found for ${entry.name} (${mode}). Pixels: ${mismatch}`);
                failures += 1;
            }
        }
    }

    await browser.close();
    server.kill();

    if (failures > 0) {
        process.exit(1);
    }
};

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
