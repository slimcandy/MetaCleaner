// Makes the link-preview card (Open Graph, 1200×630) from the page itself: the built site's
// font stack, colours, title, description and icon. Run after `npm run build`, with Playwright
// installed (`npm i --no-save playwright` or a global one):
//   npx vite preview --port 4173 & node scripts/share-card.mjs
// The screenshot is an sRGB JPEG: link previews often drop colour profiles.
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:4173/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, colorScheme: 'light' });
await page.goto(url);

// Keep the page's <html> (background, font) and its stylesheet; replace the body with the card.
await page.evaluate(() => {
  const title = document.querySelector('h1').textContent;
  const description = document.querySelector('meta[property="og:description"]').content;
  const host = new URL(document.querySelector('link[rel=canonical]').href).host;
  document.body.innerHTML = `
    <div class="card">
      <img class="mark" src="/icons/android-chrome-384x384.png" alt="" />
      <div>
        <h1>${title}</h1>
        <p class="lead">${description}</p>
        <p class="host">${host}</p>
      </div>
    </div>`;
});
await page.addStyleTag({
  content: `
    html, body { margin: 0; height: 100%; }
    .card { height: 100%; display: flex; align-items: center; justify-content: center; gap: 72px; padding: 0 96px; font-family: var(--font-sans); }
    .mark { width: 300px; height: 300px; border-radius: 48px; }
    h1 { margin: 0 0 20px; font-size: 84px; line-height: 1.05; font-weight: 600; letter-spacing: -0.02em; color: var(--color-zinc-950); }
    .lead { margin: 0 0 32px; max-width: 640px; font-size: 36px; line-height: 1.35; color: var(--color-zinc-600); }
    .host { margin: 0; font-size: 26px; color: var(--color-zinc-500); }`
});
await page.evaluate(() => Promise.all([document.fonts.ready, ...[...document.images].map((i) => i.decode())]));
await page.screenshot({ path: 'public/share/card-1200x630.jpg', type: 'jpeg', quality: 88 });

await browser.close();
console.log('share card written to public/share/card-1200x630.jpg');
