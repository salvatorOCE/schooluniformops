#!/usr/bin/env node
/**
 * Switch between REAL (production) and CLONE (testing) WooCommerce config.
 * Usage: node scripts/switch-woo-env.js [real|clone]
 *
 * One-time setup:
 *   1. cp .env.local .env.local.real     (save current production config)
 *   2. cp .env.local .env.local.clone
 *   3. Edit .env.local.clone: set WOO_URL and keys to your clone store.
 *
 * Then:
 *   node scripts/switch-woo-env.js clone   → use clone (safe for testing)
 *   node scripts/switch-woo-env.js real    → use real store (live data)
 */

const fs = require('fs');
const path = require('path');

const mode = process.argv[2]?.toLowerCase();
if (mode !== 'real' && mode !== 'clone') {
    console.error('Usage: node scripts/switch-woo-env.js [real|clone]');
    process.exit(1);
}

const root = path.resolve(__dirname, '..');
const source = path.join(root, `.env.local.${mode}`);
const target = path.join(root, '.env.local');

if (!fs.existsSync(source)) {
    console.error(`Missing ${path.basename(source)}. Create it from .env.local and set WOO_* to your ${mode} store.`);
    process.exit(1);
}

fs.copyFileSync(source, target);
console.log(`Switched to ${mode.toUpperCase()} store. Restart the app (npm run dev) to apply.`);
if (mode === 'clone') {
    console.log('  → Safe for testing: sync and status updates affect only the clone.');
} else {
    console.log('  → Live mode: sync and status updates affect the real website.');
}
