import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(packageRoot, "dist");
const fixture = JSON.parse(readFileSync(join(packageRoot, "fixtures/route-contract.json"), "utf8"));

assert.ok(existsSync(dist), "dist/ is missing; run the production build first");

function routeFile(pathname) {
  return pathname === "/" ? join(dist, "index.html") : join(dist, pathname.slice(1), "index.html");
}

function htmlFor(pathname) {
  const file = routeFile(pathname);
  assert.ok(existsSync(file), `Missing generated route: ${pathname}`);
  return readFileSync(file, "utf8");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

for (const route of fixture.routes) {
  const html = htmlFor(route.path);
  const documentHead = html.match(/<head>.*?<\/head>/s)?.[0];
  const canonical = new URL(route.path, fixture.origin).href;
  assert.ok(documentHead, `Generated route is missing document metadata: ${route.path}`);
  assert.match(html, new RegExp(`<title>${escapeRegExp(route.title)}</title>`));
  assert.match(
    html,
    new RegExp(`<meta name="description" content="${escapeRegExp(route.description)}"`),
  );
  assert.match(html, new RegExp(`<link rel="canonical" href="${escapeRegExp(canonical)}"`));
  assert.match(html, new RegExp(`<meta property="og:url" content="${escapeRegExp(canonical)}"`));
  if (route.keywords) {
    assert.match(
      html,
      new RegExp(`<meta name="keywords" content="${escapeRegExp(route.keywords)}"`),
    );
  }
  assert.doesNotMatch(documentHead, /localhost|vercel\.app/i);
}

for (const asset of fixture.staticAssets) {
  assert.ok(existsSync(join(dist, asset.slice(1))), `Missing public asset: ${asset}`);
}

const sitemap = readFileSync(join(dist, "sitemap.xml"), "utf8");
const robots = readFileSync(join(dist, "robots.txt"), "utf8");
for (const route of fixture.routes) {
  assert.ok(
    sitemap.includes(new URL(route.path, fixture.origin).href),
    `Sitemap is missing ${route.path}`,
  );
}
assert.ok(robots.includes(`${fixture.origin}/sitemap.xml`), "robots.txt has the wrong sitemap");
assert.ok(existsSync(join(dist, "404.html")), "Static 404 document is missing");

const blogIndex = htmlFor("/blog");
let previousPostPosition = -1;
for (const slug of fixture.publishedBlogSlugs) {
  const position = blogIndex.indexOf(`href="/blog/${slug}"`);
  assert.ok(position > previousPostPosition, `Blog ordering is incorrect at ${slug}`);
  previousPostPosition = position;
}

const generatedBlogSlugs = readdirSync(join(dist, "blog"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b));
assert.deepEqual(
  generatedBlogSlugs,
  [...fixture.publishedBlogSlugs].sort((a, b) => a.localeCompare(b)),
  "Generated blog routes do not match published posts",
);

const staticWithoutReact = fixture.routes.filter(({ path }) => path !== "/" && path !== "/pricing");
for (const route of staticWithoutReact) {
  assert.doesNotMatch(htmlFor(route.path), /<astro-island\b/, `${route.path} ships a React island`);
}

assert.match(htmlFor("/pricing"), /aria-label="Pricing slider"/);
assert.match(htmlFor("/"), /<video[^>]*muted/);
assert.match(htmlFor("/docs"), /aria-label="Documentation"/);

for (const href of fixture.navigation.header) {
  assert.ok(htmlFor("/").includes(`href="${href}"`), `Header is missing ${href}`);
}
for (const href of fixture.navigation.docs) {
  assert.ok(htmlFor("/docs").includes(`href="${href}"`), `Docs navigation is missing ${href}`);
}

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const generatedFiles = new Set(walk(dist).map((file) => file.slice(dist.length)));
for (const route of fixture.routes) {
  const html = htmlFor(route.path);
  for (const match of html.matchAll(/href="([^"#?]+)(?:[?#][^"]*)?"/g)) {
    const href = match[1];
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    const candidate = href.endsWith("/") ? `${href}index.html` : `${href}/index.html`;
    const assetCandidate = href;
    assert.ok(
      generatedFiles.has(candidate) || generatedFiles.has(assetCandidate),
      `Broken internal link from ${route.path}: ${href}`,
    );
  }
}

console.log(`Validated ${fixture.routes.length} routes and ${fixture.staticAssets.length} assets.`);
