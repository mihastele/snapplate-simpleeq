"use client";

import { DailyLog, MealEntry, UserProfile } from "./types";
import { getTodayKey } from "./utils";

const STORAGE_KEYS = {
  PROFILE: "snapplate_profile",
  LOGS: "snapplate_logs",
  API_KEY: "snapplate_api_key",
};

export function getProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
  return raw ? JSON.parse(raw) : null;
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
}

export function getApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEYS.API_KEY) || "";
}

export function saveApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEYS.API_KEY, key);
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
