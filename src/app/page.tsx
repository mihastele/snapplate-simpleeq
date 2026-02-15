"use client";

import { useEffect, useState } from "react";
import { getDailyLog, getProfile } from "@/lib/storage";
import { calculateTDEE, formatNumber, getTodayKey } from "@/lib/utils";
import { DailyLog, UserProfile } from "@/lib/types";
import CalorieRing from "@/components/CalorieRing";
import MealCard from "@/components/MealCard";
import { deleteMealEntry } from "@/lib/storage";
import Link from "next/link";
import { Camera, Settings } from "lucide-react";

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [log, setLog] = useState<DailyLog>({ date: getTodayKey(), meals: [] });
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    setLog(getDailyLog());
    setProfile(getProfile());
    setMounted(true);
  }, []);

  const goalCalories = profile
    ? profile.goalCalories || calculateTDEE(profile)
    : 2000;

  const totalCalories = log.meals.reduce((sum, m) => sum + m.totalCalories, 0);
  const totalProtein = log.meals.reduce((sum, m) => sum + m.totalProtein, 0);
  const totalCarbs = log.meals.reduce((sum, m) => sum + m.totalCarbs, 0);
  const totalFat = log.meals.reduce((sum, m) => sum + m.totalFat, 0);

  const handleDelete = (id: string) => {
    deleteMealEntry(id);
    setLog(getDailyLog());
  };

  if (!mounted) return null;

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Snapplate</h1>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        {!profile && (
          <Link
            href="/settings"
            className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 border border-amber-200"
          >
            <Settings className="h-3 w-3" />
            Set up profile
          </Link>
        )}
      </div>

      <div className="flex justify-center mb-6">
        <CalorieRing consumed={totalCalories} goal={goalCalories} />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl bg-blue-50 p-3 text-center">
          <p className="text-lg font-bold text-blue-700">
            {formatNumber(totalProtein)}g
          </p>
          <p className="text-xs text-blue-500">Protein</p>
        </div>
        <div className="rounded-xl bg-orange-50 p-3 text-center">
          <p className="text-lg font-bold text-orange-700">
            {formatNumber(totalCarbs)}g
          </p>
          <p className="text-xs text-orange-500">Carbs</p>
        </div>
        <div className="rounded-xl bg-purple-50 p-3 text-center">
          <p className="text-lg font-bold text-purple-700">
            {formatNumber(totalFat)}g
          </p>
          <p className="text-xs text-purple-500">Fat</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Today&apos;s Meals
        </h2>
        <Link
          href="/scan"
          className="flex items-center gap-1.5 rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:bg-green-700 transition-colors"
        >
          <Camera className="h-4 w-4" />
          Scan Food
        </Link>
      </div>

      {log.meals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-12">
          <Camera className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-gray-400 text-sm">No meals logged today</p>
          <Link
            href="/scan"
            className="mt-3 text-sm font-medium text-green-600 hover:text-green-700"
          >
            Scan your first meal →
          </Link>
        </div>
      ) : (
        <div className="space-y-3 pb-4">
          {log.meals
            .slice()
            .reverse()
            .map((meal) => (
              <MealCard key={meal.id} meal={meal} onDelete={handleDelete} />
            ))}
        </div>
      )}
    </div>
  );
}
