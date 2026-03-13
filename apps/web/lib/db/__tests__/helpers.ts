import { db } from '../index';

/**
 * Reset the database between tests for isolation.
 * Deletes all data and re-opens the connection.
 */
export async function resetDb(): Promise<void> {
  await db.delete();
  await db.open();
}
