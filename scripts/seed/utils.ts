import mongoose from 'mongoose';

/**
 * Logging utilities for seed operations
 */
export const logger = {
  info: (message: string) => console.log(`  [i] ${message}`),
  create: (entity: string, identifier: string) => console.log(`  [+] ${entity}: ${identifier}`),
  skip: (entity: string, identifier: string) => console.log(`  [~] ${entity}: ${identifier} (exists)`),
  update: (entity: string, identifier: string) => console.log(`  [!] ${entity}: ${identifier} (updated)`),
  delete: (entity: string, count: number) => console.log(`  [-] ${entity}: ${count} deleted`),
  error: (message: string) => console.error(`  [x] Error: ${message}`),
  section: (name: string) => console.log(`\n--- ${name} ---`),
  summary: (entity: string, created: number, skipped: number) =>
    console.log(`  ${entity}: ${created} created, ${skipped} skipped`),
};

/**
 * Generate a deterministic ObjectId from a prefix and suffix
 * This ensures the same seed data always gets the same IDs
 */
export function generateSeedId(prefix: string, suffix: string): mongoose.Types.ObjectId {
  // Convert prefix and suffix to hex, pad/truncate to exactly 24 chars
  const combined = `${prefix}${suffix}`;
  const hex = Buffer.from(combined).toString('hex').slice(0, 24).padEnd(24, '0');
  return new mongoose.Types.ObjectId(hex);
}

/**
 * Parse CLI arguments into options object
 */
export function parseArgs(args: string[]): {
  reset: boolean;
  clear: boolean;
  only: string[];
  production: boolean;
} {
  const options = {
    reset: false,
    clear: false,
    only: [] as string[],
    production: false,
  };

  for (const arg of args) {
    if (arg === '--reset') {
      options.reset = true;
    } else if (arg === '--clear') {
      options.clear = true;
    } else if (arg === '--production') {
      options.production = true;
    } else if (arg.startsWith('--only=')) {
      options.only = arg.slice(7).split(',').filter(Boolean);
    }
  }

  return options;
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}
