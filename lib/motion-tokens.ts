export const motionTokens = {
  duration: {
    fast: 0.18,
    normal: 0.35,
    slow: 0.6,
  },
  easing: {
    smooth: [0.22, 1, 0.36, 1] as [number, number, number, number],
    sharp: [0.4, 0, 0.2, 1] as [number, number, number, number],
  },
  distance: {
    sm: 8,
    md: 16,
    lg: 24,
  },
} as const;

function isLowEndDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { deviceMemory?: number };
  if (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) {
    return true;
  }
  return nav.deviceMemory === undefined && navigator.hardwareConcurrency <= 4;
}

export function getMotionDuration(
  token: keyof typeof motionTokens.duration,
): number {
  const base = motionTokens.duration[token];
  return isLowEndDevice() ? base * 0.5 : base;
}

export function getMotionTransition(
  token: keyof typeof motionTokens.duration = "normal",
) {
  return {
    duration: getMotionDuration(token),
    ease: motionTokens.easing.smooth,
  };
}
