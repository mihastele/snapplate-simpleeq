"use client";

import { MealEntry } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface MealCardProps {
  meal: MealEntry;
  onDelete?: (id: string) => void;
}

export default function MealCard({ meal, onDelete }: MealCardProps) {
  const [expanded, setExpanded] = useState(false);
  const time = new Date(meal.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {meal.imageDataUrl && (
          <img
            src={meal.imageDataUrl}
            alt="Meal"
            className="h-16 w-16 rounded-lg object-cover"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{time}</p>
            {onDelete && (
              <button
                onClick={() => onDelete(meal.id)}
                className="text-gray-300 hover:text-red-500 transition-colors p-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="text-lg font-bold text-gray-900">
            {formatNumber(meal.totalCalories)} kcal
          </p>
          <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
            <span>P: {formatNumber(meal.totalProtein)}g</span>
            <span>C: {formatNumber(meal.totalCarbs)}g</span>
            <span>F: {formatNumber(meal.totalFat)}g</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 flex w-full items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600"
      >
        {expanded ? (
          <>
            Hide details <ChevronUp className="h-3 w-3" />
          </>
        ) : (
          <>
            {meal.foods.length} item{meal.foods.length !== 1 && "s"}{" "}
            <ChevronDown className="h-3 w-3" />
          </>
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5 border-t pt-2">
          {meal.foods.map((food, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium text-gray-700">{food.name}</span>
                <span className="ml-1 text-gray-400">({food.amount})</span>
              </div>
              <span className="text-gray-600 font-medium">
                {formatNumber(food.calories)} kcal
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
