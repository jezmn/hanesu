const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { main } = require('../bin/create-hanesu.js');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hanesu-cli-'));
}

function countHanesuBlocks(text) {
  return (text.match(/<!-- hanesu:start -->/g) || []).length;
}

async function run(args) {
  const originalLog = console.log;
  const logs = [];
  console.log = (...parts) => {
    logs.push(parts.join(' '));
  };
  try {
    await main(args);
    return logs.join('\n');
  } finally {
    console.log = originalLog;
  }
}

function countFiles(dir) {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, entry.name);
    count += entry.isDirectory() ? countFiles(fp) : 1;
  }
  return count;
}

async function testInitCreatesWorkspace() {
  const dir = makeTempDir();

  await run(['--target', dir]);

  assert.equal(fs.existsSync(path.join(dir, '.hanesu', 'workflow.md')), true);
  assert.equal(fs.existsSync(path.join(dir, '.hanesu', 'features', '.gitkeep')), true);
  assert.equal(fs.existsSync(path.join(dir, '.hanesu', 'progress', 'checkpoints', '.gitkeep')), true);

  const agents = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  assert.equal(countHanesuBlocks(agents), 1);
  assert.match(agents, /<!-- hanesu:end -->/);
}

async function testUpdateIsIdempotent() {
  const dir = makeTempDir();

  await run(['--target', dir]);
  const agentsPath = path.join(dir, 'AGENTS.md');
  fs.writeFileSync(agentsPath, `# Project Notes\n\n${fs.readFileSync(agentsPath, 'utf8')}`);

  await run(['--target', dir, '--update']);
  await run(['--target', dir, '--update']);

  const agents = fs.readFileSync(agentsPath, 'utf8');
  assert.match(agents, /# Project Notes/);
  assert.equal(countHanesuBlocks(agents), 1);
}

async function runAll() {
  await testInitCreatesWorkspace();
  await testUpdateIsIdempotent();
  console.log('cli tests passed');
}

runAll().catch(error => {
  console.error(error);
  process.exitCode = 1;
});