import { db } from '../index';
import { resetDb } from './helpers';

afterEach(async () => {
  await resetDb();
});

describe('Dexie + fake-indexeddb smoke test', () => {
  it('should start with zero experiments', async () => {
    const count = await db.experiments.count();
    expect(count).toBe(0);
  });
});
