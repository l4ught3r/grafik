"use client";

import { AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-lg flex-1 items-center px-4 py-16">
      <EmptyState
        icon={AlertCircle}
        title="Что-то пошло не так"
        description="Произошла ошибка при загрузке страницы. Попробуйте ещё раз."
        action={
          <Button onClick={reset} variant="primary">
            Попробовать снова
          </Button>
        }
        className="w-full"
      />
    </main>
  );
}
