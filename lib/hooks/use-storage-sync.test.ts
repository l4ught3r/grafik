import { describe, expect, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { useStorageSync } from "@/lib/hooks/use-storage-sync";
import { SCHEDULES_STORAGE_KEY } from "@/lib/storage";

describe("useStorageSync", () => {
  test("вызывает callback при storage event", () => {
    let calls = 0;
    renderHook(() =>
      useStorageSync(() => {
        calls += 1;
      }, [SCHEDULES_STORAGE_KEY]),
    );

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: SCHEDULES_STORAGE_KEY,
          newValue: "[]",
        }),
      );
    });

    expect(calls).toBe(1);
  });

  test("игнорирует события с другим ключом", () => {
    let calls = 0;
    renderHook(() =>
      useStorageSync(() => {
        calls += 1;
      }, [SCHEDULES_STORAGE_KEY]),
    );

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "other-key",
          newValue: "[]",
        }),
      );
    });

    expect(calls).toBe(0);
  });
});
