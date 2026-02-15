"use client";

import { useEffect, useState } from "react";
import {
  getProfile,
  saveProfile,
  getApiKey,
  saveApiKey,
} from "@/lib/storage";
import { ActivityLevel, Sex, UserProfile } from "@/lib/types";
import { calculateTDEE, formatNumber } from "@/lib/utils";
import { Save, Calculator, Key, Eye, EyeOff } from "lucide-react";

const activityLabels: Record<ActivityLevel, string> = {
  sedentary: "Sedentary (little or no exercise)",
  light: "Light (exercise 1-3 days/week)",
  moderate: "Moderate (exercise 3-5 days/week)",
  active: "Active (exercise 6-7 days/week)",
  very_active: "Very Active (hard exercise daily)",
};

export default function SettingsPage() {
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [activityLevel, setActivityLevel] =
    useState<ActivityLevel>("moderate");
  const [goalCalories, setGoalCalories] = useState("");
  const [apiKey, setApiKeyState] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tdee, setTdee] = useState<number | null>(null);

  useEffect(() => {
    const profile = getProfile();
    if (profile) {
      setSex(profile.sex);
      setAge(String(profile.age));
      setWeight(String(profile.weight));
      setHeight(String(profile.height));
      setActivityLevel(profile.activityLevel);
      if (profile.goalCalories) {
        setGoalCalories(String(profile.goalCalories));
      }
    }
    setApiKeyState(getApiKey());
  }, []);

  useEffect(() => {
    if (age && weight && height) {
      const profile: UserProfile = {
        sex,
        age: Number(age),
        weight: Number(weight),
        height: Number(height),
        activityLevel,
      };
      setTdee(calculateTDEE(profile));
    } else {
      setTdee(null);
    }
  }, [sex, age, weight, height, activityLevel]);

  const handleSave = () => {
    const profile: UserProfile = {
      sex,
      age: Number(age),
      weight: Number(weight),
      height: Number(height),
      activityLevel,
      goalCalories: goalCalories ? Number(goalCalories) : undefined,
    };
    saveProfile(profile);
    saveApiKey(apiKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleUseTDEE = () => {
    if (tdee) {
      setGoalCalories(String(tdee));
    }
  };

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* API Key Section */}
      <section className="mb-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
          <Key className="h-5 w-5 text-green-600" />
          OpenAI API Key
        </h2>
        <p className="text-sm text-gray-500 mb-3">
          Required for food recognition. Your key is stored locally and never
          sent to our servers.
        </p>
        <div className="relative">
          <input
            type={showApiKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKeyState(e.target.value)}
            placeholder="sk-..."
            className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          />
          <button
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showApiKey ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </section>

      {/* Profile Section */}
      <section className="mb-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
          <Calculator className="h-5 w-5 text-green-600" />
          Calorie Calculator
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Calculate your daily calorie needs (TDEE) based on your body metrics
          and activity level.
        </p>

        <div className="space-y-4">
          {/* Sex */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Sex
            </label>
            <div className="flex gap-2">
              {(["male", "female"] as Sex[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSex(s)}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                    sex === s
                      ? "bg-green-600 text-white shadow-md"
                      : "border-2 border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Age */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Age
            </label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 25"
              min="10"
              max="120"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
          </div>

          {/* Weight */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Weight (kg)
            </label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 70"
              min="20"
              max="300"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
          </div>

          {/* Height */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Height (cm)
            </label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="e.g. 175"
              min="100"
              max="250"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
          </div>

          {/* Activity Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Activity Level
            </label>
            <select
              value={activityLevel}
              onChange={(e) =>
                setActivityLevel(e.target.value as ActivityLevel)
              }
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 bg-white"
            >
              {Object.entries(activityLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* TDEE Result */}
          {tdee && (
            <div className="rounded-xl bg-green-50 border border-green-200 p-4">
              <p className="text-sm text-green-700 mb-1">
                Your estimated daily calorie needs:
              </p>
              <p className="text-2xl font-bold text-green-700">
                {formatNumber(tdee)} kcal/day
              </p>
              <button
                onClick={handleUseTDEE}
                className="mt-2 text-sm font-medium text-green-600 hover:text-green-700 underline"
              >
                Use this as my daily goal →
              </button>
            </div>
          )}

          {/* Goal Calories Override */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Daily Calorie Goal (optional override)
            </label>
            <input
              type="number"
              value={goalCalories}
              onChange={(e) => setGoalCalories(e.target.value)}
              placeholder={tdee ? `Calculated: ${tdee}` : "e.g. 2000"}
              min="500"
              max="10000"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
          </div>
        </div>
      </section>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-medium text-white shadow-md transition-all ${
          saved
            ? "bg-green-500"
            : "bg-green-600 hover:bg-green-700 active:scale-[0.98]"
        }`}
      >
        <Save className="h-5 w-5" />
        {saved ? "Saved!" : "Save Settings"}
      </button>

      {/* About */}
      <section className="mt-8 text-center">
        <p className="text-xs text-gray-400">
          Snapplate v0.1.0 — Open source calorie tracker
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Powered by AI vision. Estimates may vary.
        </p>
      </section>
    </div>
  );
}
