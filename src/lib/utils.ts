import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ActivityLevel, Sex, UserProfile } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor equation
 */
export function calculateBMR(sex: Sex, weight: number, height: number, age: number): number {
  if (sex === "male") {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  }
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

/**
 * Calculate Total Daily Energy Expenditure
 */
export function calculateTDEE(profile: UserProfile): number {
  const bmr = calculateBMR(profile.sex, profile.weight, profile.height, profile.age);
  const multipliers: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  return Math.round(bmr * multipliers[profile.activityLevel]);
}

/**
 * Get today's date as YYYY-MM-DD
 */
export function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Format a number with commas
 */
export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString();
}
