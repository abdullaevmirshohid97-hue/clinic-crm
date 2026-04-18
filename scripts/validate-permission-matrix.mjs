import { readFile } from 'node:fs/promises';
import path from 'node:path';

const roles = [
  'super_admin',
  'admin',
  'doctor',
  'cashier',
  'nurse',
  'reception',
  'warehouse_manager',
];

const features = [
  'dashboard',
  'reception',
  'queue',
  'inpatient',
  'laboratory',
  'pharmacy',
  'cashier',
  'journal',
  'analytics',
  'marketing',
  'archive',
  'staff',
  'subscription',
  'settings',
];

const migrationPath = path.resolve(
  process.cwd(),
  'supabase',
  'migrations',
  '20260417000000_app_permissions_seed.sql'
);

const tuplePattern = /\('([^']+)'\s*,\s*'([^']+)'\s*,\s*([01])\)/g;

const main = async () => {
  const sql = await readFile(migrationPath, 'utf8');
  const matrix = new Map();
  const duplicates = [];
  const invalidAccessValues = [];

  for (const match of sql.matchAll(tuplePattern)) {
    const role = match[1];
    const feature = match[2];
    const canAccess = Number(match[3]);

    const key = `${role}::${feature}`;
    if (matrix.has(key)) duplicates.push(key);
    matrix.set(key, canAccess);

    if (canAccess !== 0 && canAccess !== 1) {
      invalidAccessValues.push(key);
    }
  }

  const missing = [];
  for (const role of roles) {
    for (const feature of features) {
      const key = `${role}::${feature}`;
      if (!matrix.has(key)) missing.push(key);
    }
  }

  if (duplicates.length || invalidAccessValues.length || missing.length) {
    console.error('Permission matrix validation failed.');
    if (missing.length) {
      console.error(`Missing entries (${missing.length}):`);
      console.error(missing.join('\n'));
    }
    if (duplicates.length) {
      console.error(`Duplicate entries (${duplicates.length}):`);
      console.error(duplicates.join('\n'));
    }
    if (invalidAccessValues.length) {
      console.error(`Invalid canAccess values (${invalidAccessValues.length}):`);
      console.error(invalidAccessValues.join('\n'));
    }
    process.exit(1);
  }

  const expectedCount = roles.length * features.length;
  if (matrix.size !== expectedCount) {
    console.error(
      `Permission matrix contains unexpected entries. Expected ${expectedCount}, found ${matrix.size}.`
    );
    process.exit(1);
  }

  console.log(`Permission matrix is valid (${matrix.size} entries).`);
};

main().catch((error) => {
  console.error('Failed to validate permission matrix:', error);
  process.exit(1);
});
