import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-lg flex-1 items-center px-4 py-16">
      <EmptyState
        icon={FileQuestion}
        title="Страница не найдена"
        description="Запрашиваемая страница не существует или была удалена."
        action={
          <Link href="/">
            <Button>На главную</Button>
          </Link>
        }
        className="w-full"
      />
    </main>
  );
}
