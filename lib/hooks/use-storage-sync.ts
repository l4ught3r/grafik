"use client";

import { useEffect } from "react";

export function useStorageSync(refresh: () => void, keys: readonly string[]) {
  const keysKey = keys.join("\0");

  useEffect(() => {
    const keySet = keysKey.split("\0");
    const onStorage = (event: StorageEvent) => {
      if (event.key && keySet.includes(event.key)) {
        refresh();
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh, keysKey]);
}
