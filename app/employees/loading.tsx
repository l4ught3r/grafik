import { Spinner } from "@/components/ui/Spinner";

export default function EmployeesLoading() {
  return (
    <main className="mx-auto flex max-w-3xl items-center justify-center px-4 py-24">
      <Spinner className="size-8 text-primary" />
    </main>
  );
}
