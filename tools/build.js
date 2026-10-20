#!/usr/bin/env node
/**
 * build.js — bundles index.html + css/*.css + js/*.js into ONE self-contained file.
 *
 *   node tools/build.js              -> dist/beastmarch.html   (full document)
 *   node tools/build.js --fragment   -> dist/beastmarch.fragment.html (no <html>/<head>/<body>
 *                                       wrapper; for hosts that add their own page skeleton)
 *
 * It reads the <link rel="stylesheet" href="css/..."> and <script src="js/..."> tags in
 * index.html in order and replaces each with the file's contents inline, so index.html
 * stays the single source of truth for load order. No dependencies.
 */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const fragment = process.argv.includes('--fragment');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// Inline local stylesheets and scripts (remote font links are left alone).
html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g,
  (_, f) => '<style>\n' + fs.readFileSync(path.join(root, f), 'utf8') + '</style>');
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g,
  (_, f) => '<script>\n' + fs.readFileSync(path.join(root, f), 'utf8') + '\n</script>');

if (fragment) {
  const head = html.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<meta charset[^>]*>\n?|<meta name="viewport"[^>]*>\n?/g, '');
  const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
  html = head.trim() + '\n' + body.trim() + '\n';
}
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', fragment ? 'beastmarch.fragment.html' : 'beastmarch.html');
fs.writeFileSync(out, html);
console.log('wrote', path.relative(root, out), (html.length / 1024).toFixed(0) + ' KB');
