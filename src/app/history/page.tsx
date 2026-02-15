"use client";

import { useEffect, useState } from "react";
import { getDailyLog, getLogDates, deleteMealEntry } from "@/lib/storage";
import { DailyLog } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import MealCard from "@/components/MealCard";
import { Calendar } from "lucide-react";

export default function HistoryPage() {
  const [mounted, setMounted] = useState(false);
  const [dates, setDates] = useState<string[]>([]);
  const [logs, setLogs] = useState<Record<string, DailyLog>>({});

  const loadData = () => {
    const allDates = getLogDates();
    setDates(allDates);
    const allLogs: Record<string, DailyLog> = {};
    allDates.forEach((d) => {
      allLogs[d] = getDailyLog(d);
    });
    setLogs(allLogs);
  };

  useEffect(() => {
    loadData();
    setMounted(true);
  }, []);

  const handleDelete = (id: string, date: string) => {
    deleteMealEntry(id, date);
    loadData();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split("T")[0]) return "Today";
    if (dateStr === yesterday.toISOString().split("T")[0]) return "Yesterday";

    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  if (!mounted) return null;

  return (
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">History</h1>

      {dates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Calendar className="h-12 w-12 text-gray-300 mb-3" />
          <p className="text-gray-400">No meals logged yet</p>
        </div>
      ) : (
        <div className="space-y-6 pb-4">
          {dates.map((date) => {
            const log = logs[date];
            if (!log || log.meals.length === 0) return null;
            const totalCal = log.meals.reduce(
              (s, m) => s + m.totalCalories,
              0
            );
            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold text-gray-700">
                    {formatDate(date)}
                  </h2>
                  <span className="text-sm font-medium text-gray-500">
                    {formatNumber(totalCal)} kcal
                  </span>
                </div>
                <div className="space-y-2">
                  {log.meals
                    .slice()
                    .reverse()
                    .map((meal) => (
                      <MealCard
                        key={meal.id}
                        meal={meal}
                        onDelete={(id) => handleDelete(id, date)}
                      />
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
