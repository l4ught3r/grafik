import { CalendarDays, Plus, Users } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Графики медперсонала
        </h1>
        <p className="mt-3 text-muted">
          Создавайте и редактируйте месячные графики смен
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/schedules/new">
          <Card hover className="h-full">
            <div className="flex flex-col items-center text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-accent-soft">
                <Plus className="size-6 text-primary" aria-hidden />
              </div>
              <h2 className="mt-3 font-medium text-foreground">
                Создать график
              </h2>
              <p className="mt-1 text-sm text-muted">
                Новый график на выбранный месяц
              </p>
            </div>
          </Card>
        </Link>

        <Link href="/schedules">
          <Card hover className="h-full">
            <div className="flex flex-col items-center text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-accent-soft">
                <CalendarDays className="size-6 text-primary" aria-hidden />
              </div>
              <h2 className="mt-3 font-medium text-foreground">Мои графики</h2>
              <p className="mt-1 text-sm text-muted">
                Просмотр и редактирование
              </p>
            </div>
          </Card>
        </Link>

        <Link href="/employees">
          <Card hover className="h-full">
            <div className="flex flex-col items-center text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-accent-soft">
                <Users className="size-6 text-primary" aria-hidden />
              </div>
              <h2 className="mt-3 font-medium text-foreground">Сотрудники</h2>
              <p className="mt-1 text-sm text-muted">
                Списки сотрудников для графиков
              </p>
            </div>
          </Card>
        </Link>
      </div>
    </main>
  );
}
