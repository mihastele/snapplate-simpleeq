"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getProfile,
  saveProfile,
  getAISettings,
  saveAISettings,
  getStorageUsage,
  clearOldLogs,
} from "@/lib/storage";
import { ActivityLevel, AIProvider, KeySource, Sex, UserProfile } from "@/lib/types";
import { calculateTDEE, formatNumber } from "@/lib/utils";
import {
  Save,
  Calculator,
  Key,
  Eye,
  EyeOff,
  Cpu,
  RefreshCw,
  Loader2,
  Server,
  Monitor,
  Database,
  Trash2,
} from "lucide-react";

interface ModelOption {
  id: string;
  name: string;
}

const activityLabels: Record<ActivityLevel, string> = {
  sedentary: "Sedentary (little or no exercise)",
  light: "Light (exercise 1-3 days/week)",
  moderate: "Moderate (exercise 3-5 days/week)",
  active: "Active (exercise 6-7 days/week)",
  very_active: "Very Active (hard exercise daily)",
};

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [activityLevel, setActivityLevel] =
    useState<ActivityLevel>("moderate");
  const [goalCalories, setGoalCalories] = useState("");

  // AI settings
  const [provider, setProvider] = useState<AIProvider>("openai");
  const [model, setModel] = useState("gpt-4o");
  const [keySource, setKeySource] = useState<KeySource>("local");
  const [localApiKey, setLocalApiKey] = useState("");
  const [customApiUrl, setCustomApiUrl] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  // Server config
  const [hasServerKey, setHasServerKey] = useState(false);
  const [serverProvider, setServerProvider] = useState<string | null>(null);
  const [serverModel, setServerModel] = useState<string | null>(null);
  const [serverCustomApiUrl, setServerCustomApiUrl] = useState<string | null>(null);

  // Models list
  const [models, setModels] = useState<ModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tdee, setTdee] = useState<number | null>(null);
  const [storageUsage, setStorageUsage] = useState({ used: 0, total: 0, percentage: 0 });

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

    const ai = getAISettings();
    setProvider(ai.provider);
    setModel(ai.model);
    setKeySource(ai.keySource);
    setLocalApiKey(ai.localApiKey);
    setCustomApiUrl(ai.customApiUrl);

    // Fetch server config
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg) => {
        setHasServerKey(cfg.hasServerKey);
        setServerProvider(cfg.serverProvider);
        setServerModel(cfg.serverModel);
        setServerCustomApiUrl(cfg.serverCustomApiUrl);
      })
      .catch(() => {});

    setMounted(true);
    
    // Update storage usage
    setStorageUsage(getStorageUsage());
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

  const fetchModels = useCallback(async () => {
    setModelsLoading(true);
    setModelsError(null);
    try {
      const useServer = keySource === "server";
      const params = new URLSearchParams({
        provider,
        useServerKey: String(useServer),
      });
      if (!useServer && localApiKey) {
        params.set("apiKey", localApiKey);
      }
      if (!useServer && provider === "custom" && customApiUrl) {
        params.set("customApiUrl", customApiUrl);
      }
      const res = await fetch(`/api/models?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch models");
      setModels(data.models || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch models";
      setModelsError(msg);
      setModels([]);
    } finally {
      setModelsLoading(false);
    }
  }, [provider, keySource, localApiKey, customApiUrl]);

  const handleSave = () => {
    setError(null);
    
    // Validate custom API URL for custom provider with local key
    if (provider === "custom" && keySource === "local" && !customApiUrl.trim()) {
      setError("Custom API URL is required when using Custom provider with local key.");
      return;
    }

    const profile: UserProfile = {
      sex,
      age: Number(age),
      weight: Number(weight),
      height: Number(height),
      activityLevel,
      goalCalories: goalCalories ? Number(goalCalories) : undefined,
    };
    saveProfile(profile);
    
    const aiSettings = { provider, model, keySource, localApiKey, customApiUrl };
    console.log("Debug - Saving AI Settings:", aiSettings);
    saveAISettings(aiSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    
    // Update storage usage after saving
    setStorageUsage(getStorageUsage());
  };

  const handleClearLogs = () => {
    if (confirm("This will remove all food logs except the last 30 days. Images will be truncated to save space. Continue?")) {
      clearOldLogs(30);
      setStorageUsage(getStorageUsage());
    }
  };

  const handleUseTDEE = () => {
    if (tdee) {
      setGoalCalories(String(tdee));
    }
  };

  if (!mounted) return null;

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* AI Provider Section */}
      <section className="mb-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
          <Cpu className="h-5 w-5 text-green-600" />
          AI Provider
        </h2>
        <p className="text-sm text-gray-500 mb-3">
          Choose between OpenAI, OpenRouter, or a custom OpenAI-compatible API for food recognition.
        </p>
        <div className="flex gap-2 mb-4">
          {(["openai", "openrouter", "custom"] as AIProvider[]).map((p) => (
            <button
              key={p}
              onClick={() => {
                if (keySource !== "server") {
                  setProvider(p);
                  setModels([]);
                  setModel(p === "openai" ? "gpt-4o" : "");
                }
              }}
              disabled={keySource === "server"}
              className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                provider === p
                  ? keySource === "server"
                    ? "bg-gray-300 text-gray-500"
                    : "bg-green-600 text-white shadow-md"
                  : keySource === "server"
                  ? "border-2 border-gray-200 text-gray-300 cursor-not-allowed"
                  : "border-2 border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {p === "openai" ? "OpenAI" : p === "openrouter" ? "OpenRouter" : "Custom"}
            </button>
          ))}
        </div>
        {keySource === "server" && (
          <p className="text-xs text-gray-500">
            AI provider is managed by server configuration
          </p>
        )}

        {/* Custom API URL */}
        {provider === "custom" && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Custom API URL
            </label>
            <p className="text-xs text-gray-400 mb-2">
              OpenAI-compatible API endpoint (e.g. https://api.example.com/v1)
            </p>
            <input
              type="url"
              value={keySource === "server" && serverCustomApiUrl ? serverCustomApiUrl : customApiUrl}
              onChange={(e) => setCustomApiUrl(e.target.value)}
              disabled={keySource === "server"}
              placeholder="https://api.example.com/v1"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:bg-gray-50 disabled:text-gray-400"
            />
            {keySource === "server" && (
              <p className="mt-1.5 text-xs text-gray-500">
                Custom URL is configured on the server
              </p>
            )}
          </div>
        )}

        {/* Key Source */}
        {hasServerKey && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              API Key Source
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setKeySource("server")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                  keySource === "server"
                    ? "bg-blue-600 text-white shadow-md"
                    : "border-2 border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Server className="h-4 w-4" />
                Server Key
              </button>
              <button
                onClick={() => setKeySource("local")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-colors ${
                  keySource === "local"
                    ? "bg-blue-600 text-white shadow-md"
                    : "border-2 border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Monitor className="h-4 w-4" />
                My Key
              </button>
            </div>
            {keySource === "server" && serverProvider && (
              <p className="mt-2 text-xs text-blue-600">
                Server is configured with {serverProvider}
                {serverModel ? ` (${serverModel})` : ""}
                {serverProvider === "custom" && serverCustomApiUrl ? ` at ${serverCustomApiUrl}` : ""}
              </p>
            )}
          </div>
        )}

        {/* Local API Key Input */}
        {keySource === "local" && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Key className="inline h-4 w-4 mr-1" />
              API Key
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Your key is stored locally in the browser only.
            </p>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={localApiKey}
                onChange={(e) => setLocalApiKey(e.target.value)}
                placeholder={
                  provider === "openai" 
                    ? "sk-..." 
                    : provider === "openrouter"
                    ? "sk-or-..."
                    : "your-api-key"
                }
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
          </div>
        )}

        {/* Model Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Model
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              {models.length > 0 ? (
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={keySource === "server"}
                  className={`w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 bg-white ${
                    keySource === "server" ? "bg-gray-50 text-gray-400" : ""
                  }`}
                >
                  <option value="">Select a model...</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={keySource === "server"}
                  placeholder={
                    provider === "openai"
                      ? "gpt-4o"
                      : provider === "openrouter"
                      ? "google/gemini-2.0-flash-001"
                      : "your-model-name"
                  }
                  className={`w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 ${
                    keySource === "server" ? "bg-gray-50 text-gray-400" : ""
                  }`}
                />
              )}
            </div>
            <button
              onClick={fetchModels}
              disabled={modelsLoading || keySource === "server"}
              className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="Fetch available models"
            >
              {modelsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </button>
          </div>
          {modelsError && (
            <p className="mt-1.5 text-xs text-red-500">{modelsError}</p>
          )}
          {keySource === "server" && (
            <p className="mt-1.5 text-xs text-gray-500">
              Model is managed by server configuration
            </p>
          )}
        </div>
      </section>

      {/* Storage Management Section */}
      <section className="mb-8">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
          <Database className="h-5 w-5 text-green-600" />
          Storage Management
        </h2>
        <p className="text-sm text-gray-500 mb-3">
          Manage local storage usage and clear old food logs.
        </p>
        
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Storage Usage</span>
            <span className="text-sm text-gray-600">
              {formatNumber(storageUsage.used / 1024)} KB / {formatNumber(storageUsage.total / 1024)} KB
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-colors ${
                storageUsage.percentage > 80 ? 'bg-red-500' : 
                storageUsage.percentage > 60 ? 'bg-yellow-500' : 
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(storageUsage.percentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {storageUsage.percentage > 80 ? '⚠️ Storage nearly full - consider clearing old logs' : 
             storageUsage.percentage > 60 ? 'Storage getting full' : 
             'Storage usage normal'}
          </p>
        </div>
        
        <button
          onClick={handleClearLogs}
          className="flex items-center gap-2 rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Clear Old Logs
        </button>
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
