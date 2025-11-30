import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod: MongoMemoryServer | null = null;

/**
 * Connect to the in-memory database.
 * Use this in beforeAll for integration tests.
 */
export async function setupTestDB(): Promise<void> {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  // Disconnect any existing connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(uri);
}

/**
 * Drop database, close connection, and stop mongod.
 * Use this in afterAll for integration tests.
 */
export async function teardownTestDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }

  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
}

/**
 * Clear all data from all collections.
 * Use this in afterEach for integration tests.
 */
export async function clearTestDB(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  const collections = mongoose.connection.collections;

  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
}

/**
 * Get the URI of the in-memory database.
 */
export function getTestDBUri(): string | null {
  return mongod?.getUri() ?? null;
}
