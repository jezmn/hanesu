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
    '                  preserves config.md, prompts/, features/, specs/, progress/, feature.json)',
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

  console.log('Hanesu - SDD Workflow Initializer\n');
  console.log(`Target: ${options.target}`);
  if (options.dryRun) console.log('Mode: dry run (no files will be written)');
  if (options.update) console.log('Mode: update (will overwrite roles/ and workflow.md; preserve user data)');

  const mode = options.update ? 'update' : 'init';

  console.log(`Setting up .hanesu/ ...`);
  const activeDest = hanesuDest;
  const exists = fs.existsSync(activeDest);
  if (mode === 'init') {
    if (exists) {
      console.log('  .hanesu/ exists — adding missing files only');
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

  console.log(`\nHanesu ${options.dryRun ? 'dry run complete' : 'ready'}.`);
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1); });
}

module.exports = {
  main,
  parseArgs,
};
