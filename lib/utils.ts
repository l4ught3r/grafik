import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatHours(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

export function formatRate(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

export function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const nameA = a.name.trim();
    const nameB = b.name.trim();
    if (!nameA && !nameB) return 0;
    if (!nameA) return 1;
    if (!nameB) return -1;
    return nameA.localeCompare(nameB, "ru", { sensitivity: "base" });
  });
}
