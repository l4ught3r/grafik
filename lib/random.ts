export function combineSeed(...parts: number[]): number {
  let hash = 2166136261;
  for (const part of parts) {
    hash ^= part;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededShuffle<T>(items: T[], seed: number): T[] {
  const result = [...items];
  let state = seed >>> 0 || 1;

  const next = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };

  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(next() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}
