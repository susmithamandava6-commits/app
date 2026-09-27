import { storage } from "@/src/utils/storage";
import { AppSettings } from "./types";

const BLOCKED_KEY = "netsentinel.blocked-device-ids";
const SETTINGS_KEY = "netsentinel.settings";
const defaultSettings: AppSettings = { monitoringEnabled: true, alertNotifications: true, scanFrequency: "30 sec", networkName: "Home network" };

export class SecurityRepository {
  async getBlockedDeviceIds(): Promise<string[]> {
    const raw = await storage.getItem(BLOCKED_KEY, "[]");
    try {
      return Array.isArray(JSON.parse(raw ?? "[]")) ? JSON.parse(raw ?? "[]") : [];
    } catch {
      return [];
    }
  }

  async setBlockedDeviceIds(ids: string[]): Promise<boolean> {
    return storage.setItem(BLOCKED_KEY, JSON.stringify(ids));
  }

  async getSettings(): Promise<AppSettings> {
    const raw = await storage.getItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
    try {
      const parsed = JSON.parse(raw ?? "") as Partial<AppSettings>;
      return { ...defaultSettings, ...parsed };
    } catch {
      return defaultSettings;
    }
  }

  async setSettings(settings: AppSettings): Promise<boolean> {
    return storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
}

export const securityRepository = new SecurityRepository();