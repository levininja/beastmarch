/**
 * _load.js — test helper. Returns the game's JavaScript as one string, concatenating
 * js/*.js in the exact order index.html loads them. Tests append an export line
 * (`globalThis.__t={...}`) and (0,eval) the result, which mirrors how the browser shares
 * one global scope between the separate <script> files.
 */
const fs = require('fs'), path = require('path');
module.exports = function loadGameCode() {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const files = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map(m => m[1]);
  return files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
};
