const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { main } = require('../bin/create-hanesu.js');

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hanesu-cli-'));
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

function assertFullTemplateCopied(dir) {
  const template = path.join(__dirname, '..', 'template', 'hanesu');
  function walk(src, rel) {
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(path.join(src, entry.name), childRel);
      } else {
        assert.equal(fs.existsSync(path.join(dir, '.hanesu', childRel)), true, `template file .hanesu/${childRel} copied`);
      }
    }
  }
  walk(template, '');
}

async function testInitCreatesWorkspace() {
  const dir = makeTempDir();

  await run(['--target', dir]);

  assertFullTemplateCopied(dir);
  assert.equal(fs.existsSync(path.join(dir, '.hanesu', 'features', '.gitkeep')), true);
}

async function testUpdateIsIdempotent() {
  const dir = makeTempDir();
  const rolePath = path.join(dir, '.hanesu', 'roles', 'craftsman.md');

  await run(['--target', dir]);
  const original = fs.readFileSync(rolePath, 'utf8');
  fs.writeFileSync(rolePath, `${original}\n\n# Draft note\n`);

  await run(['--target', dir, '--update']);
  await run(['--target', dir, '--update']);

  assert.equal(fs.readFileSync(rolePath, 'utf8'), original, 'role restored to template on update');
}

async function testUpdatePreservesUserData() {
  const dir = makeTempDir();

  await run(['--target', dir]);
  const cfgPath = path.join(dir, '.hanesu', 'config.md');
  fs.writeFileSync(cfgPath, `${fs.readFileSync(cfgPath, 'utf8')}# Custom\n`);
  fs.writeFileSync(path.join(dir, '.hanesu', 'progress', 'history.md'), '# My history\n');

  await run(['--target', dir, '--update']);

  assert.match(fs.readFileSync(cfgPath, 'utf8'), /# Custom/, 'config.md preserved');
  assert.equal(fs.readFileSync(path.join(dir, '.hanesu', 'progress', 'history.md'), 'utf8'), '# My history\n', 'progress preserved');
}

async function runAll() {
  await testInitCreatesWorkspace();
  await testUpdateIsIdempotent();
  await testUpdatePreservesUserData();
  console.log('cli tests passed');
}

runAll().catch(error => {
  console.error(error);
  process.exitCode = 1;
});