import { describe, expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { type ToastItem, ToastViewport } from "@/components/ui/Toast";

describe("ToastViewport", () => {
  test("отображает сообщения", () => {
    const toasts: ToastItem[] = [
      { id: "1", message: "Готово", variant: "success" },
    ];

    render(<ToastViewport toasts={toasts} onDismiss={() => {}} />);
    expect(screen.getByText("Готово")).toBeInTheDocument();
  });
});
