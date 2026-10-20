#!/usr/bin/env node
/**
 * run.js — runs every *.test.js in this folder as a separate node process and reports
 * which ones printed a line starting with "FAIL" or exited non-zero.
 *   node tests/run.js            (from the project root)
 */
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path');
let bad = 0;
for (const f of fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort()) {
  const r = spawnSync('node', [path.join(__dirname, f)], { encoding: 'utf8', timeout: 180000 });
  const out = (r.stdout || '') + (r.stderr || '');
  const pass = (out.match(/^PASS\b/gm) || []).length, fail = (out.match(/^FAIL\b/gm) || []).length;
  const ok = r.status === 0 && !fail;
  if (!ok) { bad++; console.log(out.split('\n').filter(l => /^FAIL\b|Error/.test(l)).slice(0, 8).join('\n')); }
  console.log((ok ? 'ok   ' : 'FAIL ') + f + `  (${pass} checks passed${fail ? ', ' + fail + ' failed' : ''})`);
}
process.exit(bad ? 1 : 0);
