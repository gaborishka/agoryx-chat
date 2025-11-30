import { logger } from '../utils';

/**
 * Abstract base class for all seeders
 * Provides common functionality for seeding and clearing data
 */
export abstract class BaseSeeder<TData, TModel> {
  protected name: string;
  protected seedPrefix: string;

  constructor(name: string, seedPrefix: string) {
    this.name = name;
    this.seedPrefix = seedPrefix;
  }

  /**
   * Get the data to seed
   */
  abstract getData(): TData[];

  /**
   * Execute the seeding operation
   */
  abstract seed(): Promise<{ created: number; skipped: number }>;

  /**
   * Clear seeded data
   */
  abstract clear(): Promise<number>;

  /**
   * Log creation of an entity
   */
  protected logCreate(identifier: string): void {
    logger.create(this.name, identifier);
  }

  /**
   * Log skipping of an entity
   */
  protected logSkip(identifier: string): void {
    logger.skip(this.name, identifier);
  }

  /**
   * Log update of an entity
   */
  protected logUpdate(identifier: string): void {
    logger.update(this.name, identifier);
  }

  /**
   * Log summary of seeding operation
   */
  protected logSummary(created: number, skipped: number): void {
    logger.summary(this.name, created, skipped);
  }
}
