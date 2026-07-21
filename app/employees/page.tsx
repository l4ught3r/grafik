"use client";

import { ChevronRight, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { useEmployeeLists } from "@/lib/hooks/use-employee-lists";
import type { EmployeeList } from "@/lib/types";
import { generateId } from "@/lib/utils";

export default function EmployeesPage() {
  const { lists, save, remove } = useEmployeeLists();
  const [newListName, setNewListName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<EmployeeList | null>(null);

  const createList = () => {
    if (!newListName.trim()) return;
    save({
      id: generateId(),
      name: newListName.trim(),
      members: [],
    });
    setNewListName("");
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title="Мои списки"
        description="Списки сотрудников для быстрой загрузки при создании графика"
      />

      <div className="mb-8 flex gap-2">
        <Input
          placeholder="Название нового списка"
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createList()}
          className="flex-1"
        />
        <Button onClick={createList}>Создать</Button>
      </div>

      {lists.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Списков пока нет"
          description="Создайте первый список сотрудников, чтобы быстро загружать их в новые графики."
        />
      ) : (
        <div className="space-y-3">
          {lists.map((list) => (
            <div key={list.id} className="group relative">
              <Link href={`/employees/${list.id}`}>
                <Card hover className="pr-12">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-medium text-foreground">
                        {list.name}
                      </h2>
                      <p className="mt-1 text-sm text-muted">
                        {list.members.length}{" "}
                        {list.members.length === 1
                          ? "сотрудник"
                          : list.members.length < 5
                            ? "сотрудника"
                            : "сотрудников"}
                      </p>
                    </div>
                    <ChevronRight
                      className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                      aria-hidden
                    />
                  </div>
                </Card>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 className="size-4" aria-hidden />}
                className="absolute top-1/2 right-3 -translate-y-1/2 print:hidden"
                onClick={(e) => {
                  e.preventDefault();
                  setDeleteTarget(list);
                }}
                aria-label={`Удалить список ${list.name}`}
              />
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Удалить список?"
        description={
          deleteTarget
            ? `Список «${deleteTarget.name}» и все его сотрудники будут удалены.`
            : undefined
        }
        confirmLabel="Удалить"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) remove(deleteTarget.id);
        }}
      />
    </main>
  );
}
