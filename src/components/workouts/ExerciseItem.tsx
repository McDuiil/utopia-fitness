import React, { memo } from "react";
import { Award } from "lucide-react";
import { WorkoutSessionExercise } from "@/src/types";

interface ExerciseItemProps {
  exercise: WorkoutSessionExercise;
  exerciseName: string;
  language: string;
  t: (key: string) => string;
}

const ExerciseItem = memo(({ exercise, exerciseName, t }: ExerciseItemProps) => {
  return (
    <div className="space-y-2 rounded-xl bg-white/[0.03] p-3 border border-white/5">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-white/80">{exerciseName}</h4>
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">
          {exercise.sets.length} {t("sets")}
        </span>
      </div>
      <div className="space-y-1">
        {exercise.sets.map((set, idx) => (
          <div key={idx} className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className="text-white/20 font-mono w-4">{idx + 1}</span>
              <span className="text-white/60">
                {set.weight}kg × {set.reps}
              </span>
            </div>
            {set.isPR && (
              <div className="flex items-center gap-1 text-yellow-500">
                <Award size={10} />
                <span className="text-[9px] font-bold uppercase">PR</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.exercise === next.exercise &&
    prev.exerciseName === next.exerciseName &&
    prev.language === next.language
  );
});

ExerciseItem.displayName = "ExerciseItem";

export default ExerciseItem;
