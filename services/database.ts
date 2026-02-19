
import { DashboardData } from '../types';

const STORAGE_KEY = 'PRO_ACTIVE_DASHBOARD_DATA';

export const databaseService = {
  saveData: (data: DashboardData): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  loadData: (): DashboardData | null => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    try {
      return JSON.parse(saved) as DashboardData;
    } catch (e) {
      console.error('Failed to parse saved data', e);
      return null;
    }
  },

  clearData: (): void => {
    localStorage.removeItem(STORAGE_KEY);
  }
};
