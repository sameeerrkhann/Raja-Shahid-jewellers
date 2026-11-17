import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

// Reproducible local lab attribution, not a field/p75 or real-device certification.
const baseURL = process.argv[2] || "http://127.0.0.1:3101";
const label = (process.argv[3] || "local").replace(/[^a-z0-9-]/gi, "-");
const samples = Number(process.argv[4] || 3);
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || (process.platform === "win32" ? "msedge" : undefined) });
const results = [];
try {
  for (let index = 0; index < samples; index++) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.__homeProfile = { lcp: null, longTasks: [], fontsReady: null };
      new PerformanceObserver((list) => { const entry = list.getEntries().at(-1); if (entry) window.__homeProfile.lcp = { startTime: entry.startTime, url: entry.url, tag: entry.element?.tagName }; }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__homeProfile.longTasks.push({ start: entry.startTime, duration: entry.duration }); }).observe({ type: "longtask", buffered: true });
      document.fonts.ready.then(() => { window.__homeProfile.fontsReady = performance.now(); });
    });
    await page.goto(baseURL, { waitUntil: "load" });
    await page.waitForFunction(() => /desktop|mobile|reduced|fallback/.test(document.querySelector("main")?.dataset.motionState || ""));
    await page.waitForTimeout(1800);
    const sample = await page.evaluate(() => {
      const navigation = performance.getEntriesByType("navigation")[0];
      const resources = performance.getEntriesByType("resource");
      const hero = document.querySelector("[data-hero-image]");
      const image = resources.find((entry) => entry.name === hero?.currentSrc);
      const lcp = window.__homeProfile.lcp?.startTime ?? null;
      return { ...window.__homeProfile, ttfb: navigation.responseStart, hero: hero?.currentSrc, heroBytes: image?.transferSize, imageStart: image?.startTime, imageResponseEnd: image?.responseEnd, imageDuration: image?.duration, resourceLoadDelay: image ? image.startTime - navigation.responseStart : null, renderDelay: image && lcp ? lcp - image.responseEnd : null, transferBytes: resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0), scriptBytes: resources.filter((entry) => new URL(entry.name).pathname.endsWith(".js")).reduce((sum, entry) => sum + (entry.transferSize || 0), 0) };
    });
    results.push(sample);
    console.log(JSON.stringify({ sample: index + 1, ...sample }));
    await context.close();
  }
} finally { await browser.close(); }
await mkdir("artifacts/phase04/performance", { recursive: true });
await writeFile(`artifacts/phase04/performance/${label}.json`, JSON.stringify({ environment: "1440x1000 Windows headless Edge, loopback production, fresh browser contexts; no CPU/network throttle; image server cache may be warm", baseURL, label, results }, null, 2));
