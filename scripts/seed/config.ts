/**
 * Seed configuration based on environment
 */

export interface SeedConfig {
  seedDemoData: boolean;
  verbose: boolean;
  requireProductionFlag: boolean;
}

const configs: Record<string, SeedConfig> = {
  development: {
    seedDemoData: true,
    verbose: true,
    requireProductionFlag: false,
  },
  production: {
    seedDemoData: false,
    verbose: false,
    requireProductionFlag: true,
  },
  test: {
    seedDemoData: false,
    verbose: false,
    requireProductionFlag: false,
  },
};

export function getSeedConfig(): SeedConfig {
  const env = process.env.NODE_ENV || 'development';
  return configs[env] || configs.development;
}

/**
 * Validate required environment variables for seeding
 */
export function validateEnv(isProduction: boolean): void {
  const required = ['MONGODB_URI'];

  if (isProduction) {
    required.push('ADMIN_PASSWORD', 'SYSTEM_USER_PASSWORD');
  }

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
