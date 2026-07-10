import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'public', 'images', 'promo');
const backendRoot = path.join(root, 'backend', 'uploads', 'promo');
const japaneseLaunchAsset = path.join(root, 'banner image', 'arata-banner-ja-runtime-clean.png');
const locales = ['ko', 'en', 'ja', 'fr'];

const files = [
  'arata-top-benefit-wide.png',
  'arata-complete-app-download-banner.png',
  'arata-founder-signup-banner.png',
  'arata-annual-2800-wide-banner.png',
  'arata-novel-founder-banner.webp',
  'arata-launch-promo-banner-v4.png',
  'arata-login-free-webtoon-banner.png',
];

const copyTargets = [
  path.join(sourceRoot, 'i18n', 'ko'),
  path.join(backendRoot, 'i18n', 'ko'),
];

function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function text({ x, y, value, size, weight = 900, fill = '#ffffff', family = 'Arial, Malgun Gothic, Yu Gothic, sans-serif', anchor = 'start', opacity = 1, stroke, strokeWidth = 0 }) {
  return `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" opacity="${opacity}"${stroke ? ` stroke="${stroke}" stroke-width="${strokeWidth}" paint-order="stroke"` : ''}>${esc(value)}</text>`;
}

function rect({ x, y, width, height, fill, opacity = 1, rx = 0 }) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" fill="${fill}" opacity="${opacity}" />`;
}

function svg(width, height, body) {
  return Buffer.from(`<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`);
}

async function dimensions(filename) {
  const source = path.join(sourceRoot, filename);
  const meta = await sharp(source).metadata();
  return { width: meta.width || 1, height: meta.height || 1 };
}

async function writeLocalized(filename, locale, overlayBody) {
  const source = path.join(sourceRoot, filename);
  const publicOut = path.join(sourceRoot, 'i18n', locale, filename);
  const backendOut = path.join(backendRoot, 'i18n', locale, filename);
  await fs.mkdir(path.dirname(publicOut), { recursive: true });
  await fs.mkdir(path.dirname(backendOut), { recursive: true });
  const { width, height } = await dimensions(filename);
  const pipeline = sharp(source).composite([{ input: svg(width, height, overlayBody), left: 0, top: 0 }]);
  const buffer = /\.webp$/i.test(filename) ? await pipeline.webp({ quality: 92 }).toBuffer() : await pipeline.png({ compressionLevel: 9 }).toBuffer();
  await fs.writeFile(publicOut, buffer);
  await fs.writeFile(backendOut, buffer);
}

async function writeTopWideLocalized(locale, overlayBody) {
  const filename = 'arata-top-benefit-wide.png';
  const source = path.join(sourceRoot, filename);
  const publicOut = path.join(sourceRoot, 'i18n', locale, filename);
  const backendOut = path.join(backendRoot, 'i18n', locale, filename);
  await fs.mkdir(path.dirname(publicOut), { recursive: true });
  await fs.mkdir(path.dirname(backendOut), { recursive: true });
  const { width, height } = await dimensions(filename);
  const characterLayer = await sharp(source)
    .extract({ left: 3680, top: 0, width: 1040, height })
    .png()
    .toBuffer();
  const buffer = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: '#ff9846',
    },
  })
    .composite([
      { input: svg(width, height, overlayBody), left: 0, top: 0 },
      { input: characterLayer, left: 3720, top: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();
  await fs.writeFile(publicOut, buffer);
  await fs.writeFile(backendOut, buffer);
}

async function copyKo() {
  for (const dir of copyTargets) await fs.mkdir(dir, { recursive: true });
  for (const file of files) {
    const source = path.join(sourceRoot, file);
    for (const dir of copyTargets) {
      await fs.copyFile(source, path.join(dir, file));
    }
  }
}

const translations = {
  en: {
    appBadge: 'APP ONLY',
    appTitle1: 'ARATA FULL EDITION',
    appTitle2: 'APP DOWNLOAD',
    appSub: 'Install the 19+ version with no ads or censorship',
    founderBadge: 'ARATA FOUNDING MEMBER',
    firstMonth: 'First month',
    price990: 'KRW 990',
    annual: 'Annual plan',
    monthly2800: 'KRW 2,800 / mo',
    start: 'Start now',
    unlimited: 'Unlimited webtoons',
    unlimitedAll: 'Unlimited webtoons and novels',
    premium: 'Premium webtoons, no waiting',
    today: "Don't show today",
    launch: 'ARATA LAUNCH',
    justJoin: 'Join today',
    loginLine1: 'First month KRW 990',
    loginLine2: 'Unlimited webtoons',
    novelSub: 'Enjoy every title at an easy monthly price',
  },
  ja: {
    appBadge: 'アプリ専用',
    appTitle1: 'ARATA 完全版',
    appTitle2: 'アプリDL',
    appSub: '広告・検閲なしの19+版をインストール',
    founderBadge: 'ARATA 創立会員募集',
    firstMonth: '初月',
    price990: '990ウォン',
    annual: '年間払い',
    monthly2800: '月2,800ウォン',
    start: '今すぐ始める',
    unlimited: 'ウェブトゥーン読み放題',
    unlimitedAll: 'ウェブトゥーン・小説 読み放題',
    premium: '待たずに高品質作品を楽しむ',
    today: '今日は表示しない',
    launch: 'ARATA ローンチ',
    justJoin: '今登録するだけ',
    loginLine1: '初月990ウォン',
    loginLine2: 'ウェブトゥーン読み放題',
    novelSub: '月額で気軽にすべての作品を楽しもう',
  },
  fr: {
    appBadge: 'APP ONLY',
    appTitle1: 'ARATA VERSION COMPLÈTE',
    appTitle2: 'TÉLÉCHARGER',
    appSub: 'Installez la version 19+ sans publicité ni censure',
    founderBadge: 'OFFRE MEMBRE FONDATEUR',
    firstMonth: 'Premier mois',
    price990: '990 KRW',
    annual: 'Formule annuelle',
    monthly2800: '2 800 KRW / mois',
    start: 'Commencer',
    unlimited: 'Webtoons illimités',
    unlimitedAll: 'Webtoons et romans illimités',
    premium: 'Webtoons premium sans attendre',
    today: "Ne plus afficher aujourd'hui",
    launch: 'LANCEMENT ARATA',
    justJoin: 'Inscription rapide',
    loginLine1: 'Premier mois 990 ₩',
    loginLine2: 'Webtoons illimités',
    novelSub: 'Profitez de tous les contenus à petit prix',
  },
};

function completeAppOverlay(t) {
  return [
    rect({ x: 40, y: 245, width: 770, height: 625, fill: '#020609', opacity: 1, rx: 28 }),
    rect({ x: 80, y: 335, width: 270, height: 86, fill: '#00dc64', opacity: 1, rx: 14 }),
    text({ x: 215, y: 392, value: t.appBadge, size: 42, fill: '#02120a', anchor: 'middle' }),
    text({ x: 80, y: 535, value: t.appTitle1, size: 78, fill: '#ffffff', stroke: '#111111', strokeWidth: 5 }),
    text({ x: 80, y: 675, value: t.appTitle2, size: 92, fill: '#00dc64', stroke: '#06120c', strokeWidth: 4 }),
    text({ x: 80, y: 785, value: t.appSub, size: 36, fill: '#e8edf5' }),
  ].join('');
}

function founderOverlay(t) {
  return [
    rect({ x: 70, y: 95, width: 820, height: 850, fill: '#f8fffb', opacity: 1, rx: 36 }),
    rect({ x: 125, y: 130, width: 112, height: 112, fill: '#00dc64', rx: 56 }),
    text({ x: 181, y: 208, value: '♕', size: 70, fill: '#06120c', anchor: 'middle' }),
    text({ x: 270, y: 185, value: t.founderBadge, size: 36, fill: '#00b954' }),
    text({ x: 125, y: 390, value: t.firstMonth, size: 78, fill: '#061327' }),
    text({ x: 125, y: 510, value: t.price990, size: 118, fill: '#00c85a' }),
    text({ x: 125, y: 635, value: `${t.annual} ${t.monthly2800}`, size: 54, fill: '#061327' }),
    rect({ x: 120, y: 775, width: 510, height: 100, fill: '#00dc64', rx: 50 }),
    text({ x: 375, y: 841, value: `${t.start} →`, size: 42, fill: '#06120c', anchor: 'middle' }),
  ].join('');
}

function launchOverlay(t) {
  return [
    rect({ x: 45, y: 75, width: 640, height: 1225, fill: '#00160e', opacity: 1, rx: 30 }),
    rect({ x: 45, y: 1060, width: 965, height: 260, fill: '#00160e', opacity: 1, rx: 30 }),
    text({ x: 110, y: 170, value: t.launch, size: 36, fill: '#00dc64', weight: 800, letterSpacing: 8 }),
    rect({ x: 95, y: 275, width: 265, height: 62, fill: '#071829', rx: 31 }),
    text({ x: 228, y: 318, value: t.justJoin, size: 28, fill: '#ffffff', anchor: 'middle' }),
    text({ x: 95, y: 475, value: t.firstMonth, size: 72, fill: '#ffffff', stroke: '#00160e', strokeWidth: 4 }),
    text({ x: 95, y: 610, value: t.price990, size: 110, fill: '#00dc64', stroke: '#00160e', strokeWidth: 4 }),
    text({ x: 95, y: 705, value: `${t.annual} ${t.monthly2800}`, size: 35, fill: '#ffffff' }),
    text({ x: 95, y: 795, value: t.premium, size: 28, fill: '#e7fff1' }),
    rect({ x: 82, y: 1090, width: 920, height: 94, fill: '#00dc64', rx: 47 }),
    text({ x: 542, y: 1152, value: t.start, size: 46, fill: '#00160e', anchor: 'middle' }),
    text({ x: 542, y: 1256, value: t.today, size: 28, fill: '#e9fff3', anchor: 'middle' }),
  ].join('');
}

function topWideOverlay(t) {
  return [
    rect({ x: 0, y: 0, width: 6500, height: 632, fill: '#ff9846', opacity: 1 }),
    rect({ x: 2050, y: 74, width: 1550, height: 72, fill: '#d58418', opacity: 0.95, rx: 36 }),
    text({ x: 2825, y: 127, value: 'SPECIAL BENEFIT', size: 42, fill: '#ffffff', anchor: 'middle' }),
    text({ x: 2825, y: 285, value: `${t.annual} ${t.monthly2800}`, size: 112, fill: '#111111', anchor: 'middle', stroke: '#ffd48a', strokeWidth: 7 }),
    text({ x: 2825, y: 410, value: t.unlimitedAll, size: 70, fill: '#6b3b00', anchor: 'middle' }),
  ].join('');
}

function annualOverlay(t) {
  return [
    rect({ x: 470, y: 90, width: 940, height: 640, fill: '#fffdf4', opacity: 1, rx: 34 }),
    text({ x: 940, y: 250, value: t.annual, size: 72, fill: '#5f35c8', anchor: 'middle' }),
    text({ x: 940, y: 405, value: t.monthly2800, size: 118, fill: '#ff4b11', anchor: 'middle', stroke: '#ffffff', strokeWidth: 8 }),
    text({ x: 940, y: 560, value: t.unlimited, size: 82, fill: '#111111', anchor: 'middle', stroke: '#ffffff', strokeWidth: 5 }),
  ].join('');
}

function novelOverlay(t) {
  return [
    rect({ x: 70, y: 78, width: 1140, height: 460, fill: '#f3fff7', opacity: 1, rx: 30 }),
    text({ x: 210, y: 150, value: t.founderBadge, size: 36, fill: '#00b954' }),
    text({ x: 210, y: 285, value: `${t.firstMonth} ${t.price990}`, size: 72, fill: '#061327' }),
    text({ x: 210, y: 390, value: `${t.annual} ${t.monthly2800}`, size: 64, fill: '#00c85a' }),
    text({ x: 210, y: 470, value: t.novelSub, size: 36, fill: '#263142' }),
  ].join('');
}

function loginOverlay(t) {
  return [
    rect({ x: 70, y: 80, width: 1050, height: 640, fill: '#edfff5', opacity: 1, rx: 32 }),
    rect({ x: 155, y: 132, width: 460, height: 100, fill: '#061327', rx: 50 }),
    text({ x: 385, y: 198, value: t.justJoin, size: 40, fill: '#ffffff', anchor: 'middle' }),
    text({ x: 155, y: 395, value: t.loginLine1, size: 100, fill: '#061327' }),
    text({ x: 155, y: 555, value: t.loginLine2, size: 94, fill: '#061327' }),
  ].join('');
}

const renderers = {
  'arata-complete-app-download-banner.png': completeAppOverlay,
  'arata-founder-signup-banner.png': founderOverlay,
  'arata-launch-promo-banner-v4.png': launchOverlay,
  'arata-top-benefit-wide.png': topWideOverlay,
  'arata-annual-2800-wide-banner.png': annualOverlay,
  'arata-novel-founder-banner.webp': novelOverlay,
  'arata-login-free-webtoon-banner.png': loginOverlay,
};

await copyKo();

for (const locale of locales.filter((item) => item !== 'ko')) {
  for (const file of files) {
    if (locale === 'ja' && file === 'arata-launch-promo-banner-v4.png') {
      const publicOut = path.join(sourceRoot, 'i18n', locale, file);
      const backendOut = path.join(backendRoot, 'i18n', locale, file);
      await fs.mkdir(path.dirname(publicOut), { recursive: true });
      await fs.mkdir(path.dirname(backendOut), { recursive: true });
      await fs.copyFile(japaneseLaunchAsset, publicOut);
      await fs.copyFile(japaneseLaunchAsset, backendOut);
      continue;
    }
    if (file === 'arata-top-benefit-wide.png') {
      await writeTopWideLocalized(locale, renderers[file](translations[locale]));
    } else {
      await writeLocalized(file, locale, renderers[file](translations[locale]));
    }
  }
}

console.log(JSON.stringify({ generatedLocales: locales, files }, null, 2));
