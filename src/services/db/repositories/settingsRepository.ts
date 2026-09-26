import { db, DEFAULT_APP_SETTINGS } from '../../../db';
import { AppSettings } from '../../../types';

export const settingsRepository = {
  async getSettings(): Promise<AppSettings> {
    const settings = await db.appSettings.get('default');
    if (!settings) {
      await db.appSettings.put(DEFAULT_APP_SETTINGS);
      return DEFAULT_APP_SETTINGS;
    }
    return settings;
  },

  async updateSettings(updates: Partial<Omit<AppSettings, 'id'>>): Promise<AppSettings> {
    const current = await this.getSettings();
    const updated: AppSettings = {
      ...current,
      ...updates,
    };
    await db.appSettings.put(updated);
    return updated;
  },

  async resetDefaults(): Promise<AppSettings> {
    await db.appSettings.put(DEFAULT_APP_SETTINGS);
    return DEFAULT_APP_SETTINGS;
  }
};
