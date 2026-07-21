import { describe, expect, test } from "bun:test";
import { printSchedule } from "@/lib/export/print";

describe("printSchedule", () => {
  test("вызывает window.print", () => {
    let called = false;
    const originalPrint = window.print;
    window.print = () => {
      called = true;
    };

    try {
      printSchedule();
      expect(called).toBe(true);
    } finally {
      window.print = originalPrint;
    }
  });
});
