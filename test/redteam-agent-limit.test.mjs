import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
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
  const previousHome = process.env.DSH_HOME
  const previousRedteam = process.env.REDTEAM_HOME
  const previousCwd = process.cwd()
  try {
    process.env.DSH_HOME = join(root, 'home')
    delete process.env.REDTEAM_HOME
    const workspace = join(root, 'workspace')
    mkdirSync(workspace)
    process.chdir(workspace)
    writeFileSync(join(workspace, 'settings.json'), '{"maxAgents":3}')
    saveMaxAgents(join(process.env.DSH_HOME, 'redteam'), 6)
    assert.equal(maxAgentsOf(undefined, {}), 6, 'preset scope without store root must use DSH_HOME, not cwd')
    saveMaxAgents(undefined, 8)
    assert.equal(maxAgentsOf(join(process.env.DSH_HOME, 'redteam'), {}), 8)
    assert.equal(JSON.parse(readFileSync(join(workspace, 'settings.json'))).maxAgents, 3)
  } finally {
    process.chdir(previousCwd)
    if (previousHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previousHome
    if (previousRedteam === undefined) delete process.env.REDTEAM_HOME
    else process.env.REDTEAM_HOME = previousRedteam
  }
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
