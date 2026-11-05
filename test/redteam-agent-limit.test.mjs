import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DEFAULT_MAX_AGENTS, maxAgentsOf, saveMaxAgents } from '../lib/redteam/settings.js'
import { DEFAULT_PROMPTS } from '../lib/redteam/store-core.js'

const root = mkdtempSync(join(tmpdir(), 'redteam-cap-'))
try {
  assert.equal(DEFAULT_MAX_AGENTS, 8)
  assert.equal(maxAgentsOf(root, {}), 8)
  assert.equal(saveMaxAgents(root, 8), 8)
  assert.equal(maxAgentsOf(root, { REDTEAM_MAX_AGENTS: '3' }), 8)
  saveMaxAgents(root, 5)
  assert.equal(maxAgentsOf(root, {}), 5, 'same imported module must read new settings without restart')
  for (const text of [
    DEFAULT_PROMPTS.plan,
    readFileSync(new URL('../presets/redteam/agent.cordis.yml', import.meta.url), 'utf8'),
  ]) {
    assert.ok(text.includes('redteam_agent_slot'))
    assert.ok(text.includes('max'))
    assert.doesNotMatch(text, /最多 3 个执行智能体|总数不超过 3/)
  }
  console.log('agent limit: default 8, live changes and prompt consistency OK')
} finally { rmSync(root, { recursive: true, force: true }) }
