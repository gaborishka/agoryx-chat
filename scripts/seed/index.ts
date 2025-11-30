/**
 * Database Seeder Entry Point
 *
 * Usage:
 *   npm run db:seed          # Seed all data
 *   npm run db:seed:reset    # Clear and reseed
 *   npm run db:clear         # Clear seeded data only
 *
 * Flags:
 *   --reset       Clear seeded data before seeding
 *   --clear       Only clear seeded data, don't seed
 *   --only=x,y    Only run specific seeders (users,agents,conversations,messages)
 *   --production  Required flag for production environment
 */

import { connectDB } from '@/lib/db/mongoose';
import { UserSeeder } from './seeders/user.seeder';
import { AgentSeeder } from './seeders/agent.seeder';
import { ConversationSeeder } from './seeders/conversation.seeder';
import { MessageSeeder } from './seeders/message.seeder';
import { parseArgs, formatDuration, logger } from './utils';
import { getSeedConfig, validateEnv } from './config';

async function main() {
  const startTime = Date.now();
  const args = parseArgs(process.argv.slice(2));
  const config = getSeedConfig();
  const isProduction = process.env.NODE_ENV === 'production';

  // Production safety check
  if (isProduction && !args.production) {
    console.error('\n[ERROR] Running seed in production requires --production flag');
    console.error('Usage: npm run db:seed -- --production\n');
    process.exit(1);
  }

  // Validate environment
  try {
    validateEnv(isProduction);
  } catch (error) {
    console.error(`\n[ERROR] ${(error as Error).message}\n`);
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('   Agoryx Chat Database Seeder');
  console.log('========================================\n');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Demo data: ${config.seedDemoData ? 'enabled' : 'disabled'}`);

  // Connect to database
  try {
    await connectDB();
    console.log('Database: connected\n');
  } catch (error) {
    console.error('[ERROR] Failed to connect to database:', error);
    process.exit(1);
  }

  // Initialize seeders with dependencies
  const userSeeder = new UserSeeder();
  const agentSeeder = new AgentSeeder(userSeeder);
  const conversationSeeder = new ConversationSeeder(userSeeder);
  const messageSeeder = new MessageSeeder(conversationSeeder);

  // Define all seeders in execution order
  const allSeeders = [
    { name: 'users', seeder: userSeeder, required: true },
    { name: 'agents', seeder: agentSeeder, required: true },
    { name: 'conversations', seeder: conversationSeeder, required: false },
    { name: 'messages', seeder: messageSeeder, required: false },
  ];

  // Filter seeders based on --only flag and demo data setting
  let seedersToRun = allSeeders;

  if (args.only.length > 0) {
    seedersToRun = allSeeders.filter((s) => args.only.includes(s.name));
  } else if (!config.seedDemoData) {
    // In production, only seed required data
    seedersToRun = allSeeders.filter((s) => s.required);
  }

  // Clear operation
  if (args.clear || args.reset) {
    logger.section('Clearing seeded data');

    // Clear in reverse order (respect foreign keys)
    for (const { name, seeder } of [...seedersToRun].reverse()) {
      try {
        const count = await seeder.clear();
        logger.delete(name, count);
      } catch (error) {
        logger.error(`Failed to clear ${name}: ${(error as Error).message}`);
      }
    }

    if (args.clear) {
      console.log('\nClear complete.');
      console.log(`Duration: ${formatDuration(Date.now() - startTime)}\n`);
      process.exit(0);
    }
  }

  // Seed operation
  logger.section('Seeding data');

  const results: { name: string; created: number; skipped: number }[] = [];

  for (const { name, seeder } of seedersToRun) {
    console.log(`\n${name.charAt(0).toUpperCase() + name.slice(1)}:`);

    try {
      const result = await seeder.seed();
      results.push({ name, ...result });
    } catch (error) {
      logger.error(`Failed to seed ${name}: ${(error as Error).message}`);
      if (config.verbose) {
        console.error(error);
      }
    }
  }

  // Summary
  logger.section('Summary');
  const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);

  for (const result of results) {
    console.log(`  ${result.name}: ${result.created} created, ${result.skipped} skipped`);
  }

  console.log(`\n  Total: ${totalCreated} created, ${totalSkipped} skipped`);
  console.log(`  Duration: ${formatDuration(Date.now() - startTime)}`);

  console.log('\n========================================');
  console.log('   Seeding Complete');
  console.log('========================================\n');

  process.exit(0);
}

main().catch((error) => {
  console.error('\n[FATAL] Seed failed:', error);
  process.exit(1);
});
