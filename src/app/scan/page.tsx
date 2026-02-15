"use client";

import { useRef, useState, useCallback } from "react";
import { Camera, Upload, Loader2, Check, RotateCcw } from "lucide-react";
import { getAISettings, addMealEntry } from "@/lib/storage";
import { FoodItem, MealEntry } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { formatNumber } from "@/lib/utils";

type Step = "capture" | "analyzing" | "results";

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("capture");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreaming(true);
      }
    } catch {
      setError("Camera access denied. You can upload a photo instead.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
      setStreaming(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setImageDataUrl(dataUrl);
    stopCamera();
    analyzeImage(dataUrl);
  }, [stopCamera]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setImageDataUrl(dataUrl);
        stopCamera();
        analyzeImage(dataUrl);
      };
      reader.readAsDataURL(file);
    },
    [stopCamera]
  );

  const analyzeImage = async (dataUrl: string) => {
    setStep("analyzing");
    setError(null);

    const aiSettings = getAISettings();
    const useServerKey = aiSettings.keySource === "server";

    if (!useServerKey && !aiSettings.localApiKey) {
      setError("Please add your API key in Settings first.");
      setStep("capture");
      return;
    }

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: dataUrl,
          apiKey: useServerKey ? undefined : aiSettings.localApiKey,
          provider: aiSettings.provider,
          model: aiSettings.model,
          useServerKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setFoods(data.foods || []);
      setStep("results");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Analysis failed";
      setError(msg);
      setStep("capture");
    }
  };

  const handleSave = () => {
    const totalCalories = foods.reduce((s, f) => s + f.calories, 0);
    const totalProtein = foods.reduce((s, f) => s + f.protein, 0);
    const totalCarbs = foods.reduce((s, f) => s + f.carbs, 0);
    const totalFat = foods.reduce((s, f) => s + f.fat, 0);

    const entry: MealEntry = {
      id: uuidv4(),
      timestamp: Date.now(),
      imageDataUrl: imageDataUrl || undefined,
      foods,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
    };

    addMealEntry(entry);
    router.push("/");
  };

  const handleReset = () => {
    setStep("capture");
    setImageDataUrl(null);
    setFoods([]);
    setError(null);
  };

  const totalCalories = foods.reduce((s, f) => s + f.calories, 0);

  return (
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Scan Food</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {step === "capture" && (
        <div className="space-y-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300">
            {streaming ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
            ) : imageDataUrl ? (
              <img
                src={imageDataUrl}
                alt="Captured"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <Camera className="h-12 w-12 text-gray-300" />
                <p className="text-sm text-gray-400">
                  Take a photo or upload one
                </p>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="flex gap-3">
            {!streaming ? (
              <button
                onClick={startCamera}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 font-medium text-white shadow-md hover:bg-green-700 transition-colors"
              >
                <Camera className="h-5 w-5" />
                Open Camera
              </button>
            ) : (
              <button
                onClick={capturePhoto}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 font-medium text-white shadow-md hover:bg-green-700 transition-colors"
              >
                <Camera className="h-5 w-5" />
                Take Photo
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 px-5 py-3.5 font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Upload className="h-5 w-5" />
              Upload
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      )}

      {step === "analyzing" && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-green-600 mb-4" />
          <p className="text-lg font-medium text-gray-700">
            Analyzing your food...
          </p>
          <p className="text-sm text-gray-400 mt-1">
            This may take a few seconds
          </p>
        </div>
      )}

      {step === "results" && (
        <div className="space-y-4">
          {imageDataUrl && (
            <img
              src={imageDataUrl}
              alt="Meal"
              className="w-full rounded-2xl object-cover aspect-[4/3]"
            />
          )}

          <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center">
            <p className="text-3xl font-bold text-green-700">
              {formatNumber(totalCalories)} kcal
            </p>
            <p className="text-sm text-green-600 mt-1">
              Total estimated calories
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold text-gray-900">Detected Items</h2>
            {foods.map((food, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border bg-white p-3"
              >
                <div>
                  <p className="font-medium text-gray-800">{food.name}</p>
                  <p className="text-xs text-gray-500">{food.amount}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">
                    {formatNumber(food.calories)} kcal
                  </p>
                  <p className="text-xs text-gray-400">
                    P:{formatNumber(food.protein)}g C:{formatNumber(food.carbs)}g
                    F:{formatNumber(food.fat)}g
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pb-4">
            <button
              onClick={handleReset}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-gray-200 py-3.5 font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Retake
            </button>
            <button
              onClick={handleSave}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 font-medium text-white shadow-md hover:bg-green-700 transition-colors"
            >
              <Check className="h-5 w-5" />
              Log Meal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
