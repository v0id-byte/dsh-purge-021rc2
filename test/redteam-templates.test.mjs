import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, openSync, writeSync, ftruncateSync, closeSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

test('large template bodies can be indexed and searched with a small heap', () => {
  const root = mkdtempSync(join(tmpdir(), 'redteam-templates-'));
  try {
    const templates = join(root, 'templates');
    mkdirSync(templates);
    for (let i = 0; i < 8; i++) {
      const fd = openSync(join(templates, `CVE-2026-${1000 + i}.yaml`), 'w');
      writeSync(fd, `id: regression-${i}\ninfo:\n  name: 模板索引内存回归检查 ${i}\n  severity: informational\n  tags: memory-regression,metadata\n`);
      ftruncateSync(fd, 16 * 1024 * 1024);
      closeSync(fd);
    }
    const script = `
      import { RedteamStore } from ${JSON.stringify(new URL('../lib/redteam/store-core.js', import.meta.url).href)};
      import { savePlatformConfig } from ${JSON.stringify(new URL('../lib/redteam/platform-config.js', import.meta.url).href)};
      const root = process.argv[1];
      savePlatformConfig({ nucleiTemplatesDir: root + '/templates' }, root);
      const store = new RedteamStore(root);
      const before = process.resourceUsage().maxRSS;
      const stats = store.templateStats();
      const found = store.searchTemplates('memory-regression', 1);
      console.log(JSON.stringify({ total: stats.total, name: found.items[0]?.name, peakGrowthKiB: process.resourceUsage().maxRSS - before }));
    `;
    const child = spawnSync(process.execPath, ['--max-old-space-size=48', '--input-type=module', '-e', script, root], { encoding: 'utf8', timeout: 20000 });
    assert.equal(child.status, 0, child.stderr.slice(-1000));
    const result = JSON.parse(child.stdout.trim());
    assert.equal(result.total, 8);
    assert.match(result.name, /^模板索引内存回归检查 /);
    assert.ok(result.peakGrowthKiB < 16 * 1024, `template indexing added ${result.peakGrowthKiB} KiB to peak RSS`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
