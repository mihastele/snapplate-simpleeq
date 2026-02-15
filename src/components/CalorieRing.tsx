"use client";

interface CalorieRingProps {
  consumed: number;
  goal: number;
}

export default function CalorieRing({ consumed, goal }: CalorieRingProps) {
  const percentage = goal > 0 ? Math.min((consumed / goal) * 100, 100) : 0;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const isOver = consumed > goal && goal > 0;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="180" height="180" className="-rotate-90">
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth="12"
        />
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={isOver ? "#ef4444" : "#22c55e"}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-gray-900">
          {Math.round(consumed)}
        </span>
        <span className="text-sm text-gray-500">
          / {Math.round(goal)} kcal
        </span>
      </div>
    </div>
  );
}
