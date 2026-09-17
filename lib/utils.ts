import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isoFromMillis(value: number | string | undefined | null): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    return undefined;
  }
  return new Date(n).toISOString();
}

export function nowIso(date = new Date()): string {
  return date.toISOString();
}
