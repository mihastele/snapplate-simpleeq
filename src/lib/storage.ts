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
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
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
