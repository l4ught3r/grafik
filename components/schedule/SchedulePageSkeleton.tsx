import { Spinner } from "@/components/ui/Spinner";

export function SchedulePageSkeleton() {
  return (
    <main className="mx-auto flex max-w-[1800px] items-center justify-center px-4 py-16">
      <div className="flex items-center gap-3 text-sm text-muted">
        <Spinner />
        <span>Загрузка графика...</span>
      </div>
    </main>
  );
}
