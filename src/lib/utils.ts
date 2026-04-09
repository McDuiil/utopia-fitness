import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTodayStr() {
  return new Date().toLocaleDateString('en-CA');
}

export function calcCalories(p: number, c: number, f: number) {
  return Math.round(p * 4 + c * 4 + f * 9);
}
