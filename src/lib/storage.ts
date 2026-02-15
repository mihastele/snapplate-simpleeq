"use client";

import { AISettings, DailyLog, MealEntry, UserProfile } from "./types";
import { getTodayKey } from "./utils";

const STORAGE_KEYS = {
  PROFILE: "snapplate_profile",
  LOGS: "snapplate_logs",
  AI_SETTINGS: "snapplate_ai_settings",
};

export function getProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
  return raw ? JSON.parse(raw) : null;
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
}

const DEFAULT_AI_SETTINGS: AISettings = {
  provider: "openai",
  model: "gpt-4o",
  keySource: "local",
  localApiKey: "",
  customApiUrl: "",
};

export function getAISettings(): AISettings {
  if (typeof window === "undefined") return DEFAULT_AI_SETTINGS;
  const raw = localStorage.getItem(STORAGE_KEYS.AI_SETTINGS);
  if (!raw) return DEFAULT_AI_SETTINGS;
  try {
    return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveAISettings(settings: AISettings): void {
  localStorage.setItem(STORAGE_KEYS.AI_SETTINGS, JSON.stringify(settings));
}

function getAllLogs(): Record<string, DailyLog> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
  return raw ? JSON.parse(raw) : {};
}

function saveAllLogs(logs: Record<string, DailyLog>): void {
  try {
    const jsonString = JSON.stringify(logs);
    
    // Check if we're approaching storage limits
    const estimatedSize = new Blob([jsonString]).size;
    const quotaLimit = 4 * 1024 * 1024; // 4MB limit to be safe
    
    if (estimatedSize > quotaLimit) {
      console.log("Storage quota exceeded, cleaning up old logs...");
      cleanupOldLogs(logs);
      return;
    }
    
    localStorage.setItem(STORAGE_KEYS.LOGS, jsonString);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.log("Storage quota exceeded, cleaning up old logs...");
      cleanupOldLogs(logs);
    } else {
      console.error("Error saving logs:", error);
    }
  }
}

function cleanupOldLogs(logs: Record<string, DailyLog>): void {
  const dates = Object.keys(logs).sort();
  
  // Keep only the most recent 30 days
  const cutoffDate = dates[Math.max(0, dates.length - 30)];
  
  const cleanedLogs: Record<string, DailyLog> = {};
  for (const date of dates) {
    if (date >= cutoffDate) {
      cleanedLogs[date] = logs[date];
    }
  }
  
  // Also remove image data from older entries to save space
  for (const date in cleanedLogs) {
    cleanedLogs[date].meals = cleanedLogs[date].meals.map(meal => ({
      ...meal,
      imageDataUrl: meal.imageDataUrl ? meal.imageDataUrl.substring(0, 100) + '...truncated...' : undefined
    }));
  }
  
  try {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(cleanedLogs));
    console.log(`Cleaned up logs, kept ${Object.keys(cleanedLogs).length} days`);
  } catch (error) {
    console.error("Failed to save cleaned logs:", error);
    // If still failing, try even more aggressive cleanup
    emergencyCleanup();
  }
}

function emergencyCleanup(): void {
  try {
    // Keep only last 7 days and remove all images
    const logs = getAllLogs();
    const dates = Object.keys(logs).sort();
    const cutoffDate = dates[Math.max(0, dates.length - 7)];
    
    const emergencyLogs: Record<string, DailyLog> = {};
    for (const date of dates) {
      if (date >= cutoffDate) {
        emergencyLogs[date] = {
          ...logs[date],
          meals: logs[date].meals.map(meal => ({
            ...meal,
            imageDataUrl: undefined // Remove all images
          }))
        };
      }
    }
    
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(emergencyLogs));
    console.log("Emergency cleanup completed - removed all images, kept 7 days");
  } catch (error) {
    console.error("Emergency cleanup failed:", error);
    // Last resort: clear all logs
    try {
      localStorage.removeItem(STORAGE_KEYS.LOGS);
      console.log("Cleared all logs due to storage constraints");
    } catch (clearError) {
      console.error("Failed to clear logs:", clearError);
    }
  }
}

export function getDailyLog(date?: string): DailyLog {
  const key = date || getTodayKey();
  const logs = getAllLogs();
  return logs[key] || { date: key, meals: [] };
}

export function addMealEntry(entry: MealEntry, date?: string): void {
  const key = date || getTodayKey();
  const logs = getAllLogs();
  if (!logs[key]) {
    logs[key] = { date: key, meals: [] };
  }
  logs[key].meals.push(entry);
  saveAllLogs(logs);
}

export function deleteMealEntry(entryId: string, date?: string): void {
  const key = date || getTodayKey();
  const logs = getAllLogs();
  if (logs[key]) {
    logs[key].meals = logs[key].meals.filter((m) => m.id !== entryId);
    saveAllLogs(logs);
  }
}

export function getLogDates(): string[] {
  const logs = getAllLogs();
  return Object.keys(logs).sort().reverse();
}

export function getStorageUsage(): { used: number; total: number; percentage: number } {
  if (typeof window === "undefined") return { used: 0, total: 0, percentage: 0 };
  
  let totalUsed = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      totalUsed += localStorage[key].length + key.length;
    }
  }
  
  // Estimate total quota (typically 5-10MB on mobile, use conservative estimate)
  const totalQuota = 5 * 1024 * 1024; // 5MB
  
  return {
    used: totalUsed,
    total: totalQuota,
    percentage: (totalUsed / totalQuota) * 100
  };
}

export function clearOldLogs(daysToKeep: number = 30): void {
  const logs = getAllLogs();
  const dates = Object.keys(logs).sort();
  const cutoffDate = dates[Math.max(0, dates.length - daysToKeep)];
  
  const cleanedLogs: Record<string, DailyLog> = {};
  for (const date of dates) {
    if (date >= cutoffDate) {
      cleanedLogs[date] = logs[date];
    }
  }
  
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(cleanedLogs));
  console.log(`Manually cleared logs, kept ${Object.keys(cleanedLogs).length} days`);
}
