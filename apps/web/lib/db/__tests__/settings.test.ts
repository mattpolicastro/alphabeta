import { getSettings, updateSettings } from '../index';
import { resetDb } from './helpers';

afterEach(async () => {
  await resetDb();
});

describe('getSettings', () => {
  it('returns default settings on an empty DB', async () => {
    const settings = await getSettings();
    expect(settings.id).toBe('singleton');
    expect(settings.computeEngine).toBe('wasm');
    expect(settings.defaultStatsEngine).toBe('bayesian');
    expect(settings.defaultAlpha).toBe(0.05);
    expect(settings.defaultPower).toBe(0.8);
    expect(settings.srmThreshold).toBe(0.001);
    expect(settings.backupReminderDays).toBe(30);
    expect(settings.lastExportedAt).toBeNull();
  });
});

describe('updateSettings', () => {
  it('persists changes and retrieves them', async () => {
    await updateSettings({ defaultAlpha: 0.01, computeEngine: 'lambda' });
    const settings = await getSettings();
    expect(settings.defaultAlpha).toBe(0.01);
    expect(settings.computeEngine).toBe('lambda');
  });

  it('does not overwrite unrelated fields', async () => {
    await updateSettings({ lambdaUrl: 'https://example.com/lambda' });
    const settings = await getSettings();
    // Other fields should still be at their defaults
    expect(settings.defaultStatsEngine).toBe('bayesian');
    expect(settings.srmThreshold).toBe(0.001);
    expect(settings.lambdaUrl).toBe('https://example.com/lambda');
  });

  it('allows multiple updates to accumulate', async () => {
    await updateSettings({ defaultAlpha: 0.01 });
    await updateSettings({ defaultPower: 0.9 });
    const settings = await getSettings();
    expect(settings.defaultAlpha).toBe(0.01);
    expect(settings.defaultPower).toBe(0.9);
  });
});
