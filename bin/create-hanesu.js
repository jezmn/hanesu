#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TEMPLATE_HANESU = path.join(ROOT, 'template', 'hanesu');
const PKG = require(path.join(ROOT, 'package.json'));

// Paths safe to overwrite on update (framework-owned, no user data)
const UPDATE_SAFE = [
  'roles/',
  'workflow.md',
];

function readTemplateAgentsMd() {
  return fs.readFileSync(path.join(ROOT, 'template', 'AGENTS.md'), 'utf-8').trimEnd() + '\n';
}

function usage() {
  return [
    'Hanesu - SDD workflow initializer for AI coding agents',
    '',
    'Usage:',
    '  create-hanesu [options]',
    '',
    'Options:',
    '  --target <dir>  Initialize Hanesu in a target directory (default: current directory)',
    '  --dry-run       Show what would be created without writing files',
    '  --update        Update existing .hanesu/ (overwrites roles/ and workflow.md;',
    '                  preserves config.md, prompts/, features/, progress/, feature.json)',
    '  --help          Show this help message',
    '  --version       Show package version',
  ].join('\n');
}

function parseArgs(argv) {
  const options = {
    target: process.cwd(),
    dryRun: false,
    update: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--version' || arg === '-v') {
      options.version = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--update') {
      options.update = true;
    } else if (arg === '--target') {
      const value = argv[++i];
      if (!value) throw new Error('--target requires a directory');
      options.target = value;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  options.target = path.resolve(options.target);
  return options;
}

function walkDir(dir) {
  const entries = [];
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name);
    const rel = path.relative(TEMPLATE_HANESU, fp).replace(/\\/g, '/');
    if (fs.statSync(fp).isDirectory()) {
      entries.push(...walkDir(fp));
    } else {
      entries.push({ rel, src: fp });
    }
  }
  return entries;
}

function copyMissing(srcDir, destDir, dryRun) {
  const files = walkDir(srcDir);
  let count = 0;
  for (const f of files) {
    const dp = path.join(destDir, f.rel);
    if (!fs.existsSync(dp)) {
      if (!dryRun) {
        fs.mkdirSync(path.dirname(dp), { recursive: true });
        fs.copyFileSync(f.src, dp);
      }
      count++;
    }
  }
  return count;
}

function updateTemplateOwned(srcDir, destDir, dryRun) {
  const files = walkDir(srcDir);
  let count = 0;
  for (const f of files) {
    const isSafe = UPDATE_SAFE.some(p => f.rel.startsWith(p));
    if (!isSafe) continue;
    const dp = path.join(destDir, f.rel);
    if (fs.existsSync(dp)) {
      const current = fs.readFileSync(dp, 'utf-8');
      const latest = fs.readFileSync(f.src, 'utf-8');
      if (current !== latest) {
        if (!dryRun) fs.writeFileSync(dp, latest);
        count++;
      }
    } else {
      if (!dryRun) {
        fs.mkdirSync(path.dirname(dp), { recursive: true });
        fs.copyFileSync(f.src, dp);
      }
      count++;
    }
  }
  return count;
}

function upsertBlock(content, block) {
  const start = '<!-- hanesu:start -->';
  const end = '<!-- hanesu:end -->';
  const si = content.indexOf(start);
  const ei = content.indexOf(end, si + 1);
  if (si !== -1 && ei !== -1) {
    return content.slice(0, si) + block + content.slice(ei + end.length);
  }
  return content.trimEnd() + '\n\n' + block + '\n';
}

function ask(prompt) {
  const { createInterface } = require('readline');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(r => rl.question(prompt, a => { rl.close(); r(a.trim()); }));
}

async function handleAgentsMd(targetDir, dryRun) {
  const dest = path.join(targetDir, 'AGENTS.md');
  const block = readTemplateAgentsMd();
  if (!fs.existsSync(dest)) {
    if (!dryRun) fs.writeFileSync(dest, block);
    console.log(`${dryRun ? 'Would create' : 'Created'} AGENTS.md`);
    return;
  }
  if (dryRun) {
    console.log('Would prompt to update AGENTS.md');
    return;
  }
  console.log('\nAGENTS.md already exists.');
  console.log('  [1] Append/update Hanesu section');
  console.log('  [2] Skip');
  console.log('  [3] Overwrite entire file');
  const ans = await ask('  Choose [1/2/3]: ');
  if (ans === '1') {
    fs.writeFileSync(dest, upsertBlock(fs.readFileSync(dest, 'utf-8'), block));
    console.log('Updated AGENTS.md');
  } else if (ans === '3') {
    fs.writeFileSync(dest, block);
    console.log('Overwrote AGENTS.md');
  } else {
    console.log('Skipped AGENTS.md');
  }
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(usage());
    return;
  }
  if (options.version) {
    console.log(PKG.version);
    return;
  }

  const hanesuDest = path.join(options.target, '.hanesu');
  const legacyDest = path.join(options.target, '.harness');

  console.log('Hanesu - SDD Workflow Initializer\n');
  console.log(`Target: ${options.target}`);
  if (options.dryRun) console.log('Mode: dry run (no files will be written)');
  if (options.update) console.log('Mode: update (will overwrite roles/ and workflow.md; preserve user data)');

  const mode = options.update ? 'update' : 'init';

  console.log(`Setting up .hanesu/ ...`);
  const hasHanesu = fs.existsSync(hanesuDest);
  const hasLegacy = fs.existsSync(legacyDest);
  const migratingLegacy = !hasHanesu && hasLegacy;
  const activeDest = options.dryRun && migratingLegacy ? legacyDest : hanesuDest;
  if (migratingLegacy) {
    if (!options.dryRun) fs.renameSync(legacyDest, hanesuDest);
    console.log(`  ${options.dryRun ? 'Would migrate' : 'Migrated'} legacy .harness/ to .hanesu/`);
  }
  const exists = fs.existsSync(activeDest);
  if (mode === 'init') {
    if (exists) {
      const status = options.dryRun && migratingLegacy ? '.hanesu/ would exist after migration' : '.hanesu/ exists';
      console.log(`  ${status} — adding missing files only`);
    }
    const added = copyMissing(TEMPLATE_HANESU, activeDest, options.dryRun);
    console.log(`  ${added} file(s) ${options.dryRun ? 'would be created' : 'created'}, existing files preserved`);
  } else {
    if (!exists) {
      console.log('  .hanesu/ not found. Run without --update for first-time setup.');
      return;
    }
    const added = copyMissing(TEMPLATE_HANESU, activeDest, options.dryRun);
    const updated = updateTemplateOwned(TEMPLATE_HANESU, activeDest, options.dryRun);
    console.log(`  ${added} new file(s), ${updated} updated (roles/ + workflow.md)`);
  }

  const featuresDir = path.join(activeDest, 'features');
  if (!fs.existsSync(featuresDir)) {
    if (!options.dryRun) {
      fs.mkdirSync(featuresDir, { recursive: true });
      fs.writeFileSync(path.join(featuresDir, '.gitkeep'), '');
    }
    console.log(`  ${options.dryRun ? 'Would create' : 'Created'} .hanesu/features/`);
  }

  const mutationDir = path.join(activeDest, 'progress', 'mutation');
  if (!options.dryRun && !fs.existsSync(mutationDir)) {
    fs.mkdirSync(mutationDir, { recursive: true });
  }

  const diffDir = path.join(activeDest, 'progress', 'diff');
  if (!options.dryRun && !fs.existsSync(diffDir)) {
    fs.mkdirSync(diffDir, { recursive: true });
  }

  if (options.update) {
    const block = readTemplateAgentsMd();
    const agentsDest = path.join(options.target, 'AGENTS.md');
    if (fs.existsSync(agentsDest)) {
      if (!options.dryRun) fs.writeFileSync(agentsDest, upsertBlock(fs.readFileSync(agentsDest, 'utf-8'), block));
      console.log(`  ${options.dryRun ? 'Would update' : 'Updated'} AGENTS.md (hanesu block)`);
    } else {
      if (!options.dryRun) fs.writeFileSync(agentsDest, block);
      console.log(`  ${options.dryRun ? 'Would create' : 'Created'} AGENTS.md`);
    }
  } else {
    await handleAgentsMd(options.target, options.dryRun);
  }

  console.log(`\nHanesu ${options.dryRun ? 'dry run complete' : 'ready'}.`);
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1); });
}

module.exports = {
  main,
  parseArgs,
  upsertBlock,
};
