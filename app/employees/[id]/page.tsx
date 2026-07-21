"use client";

import { ArrowLeft, FileQuestion, Users } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { EmployeeCard } from "@/components/forms/EmployeeCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { useEmployeeLists } from "@/lib/hooks/use-employee-lists";
import type { EmployeeList, EmployeeListMember } from "@/lib/types";
import { generateId } from "@/lib/utils";

function createEmptyMember(): EmployeeListMember {
  return { id: generateId(), name: "", dutyPreferences: [] };
}

export default function EmployeeListPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { lists, ready, save, remove } = useEmployeeLists();
  const list = useMemo(
    () => lists.find((item) => item.id === id) ?? null,
    [lists, id],
  );
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateList = (updated: EmployeeList) => {
    save(updated);
  };

  const updateMember = (
    memberId: string,
    patch: Partial<EmployeeListMember>,
  ) => {
    if (!list) return;
    updateList({
      ...list,
      members: list.members.map((m) =>
        m.id === memberId ? { ...m, ...patch } : m,
      ),
    });
  };

  const removeMember = (memberId: string) => {
    if (!list) return;
    updateList({
      ...list,
      members: list.members.filter((m) => m.id !== memberId),
    });
  };

  const addMember = () => {
    if (!list) return;
    updateList({
      ...list,
      members: [...list.members, createEmptyMember()],
    });
  };

  const handleDelete = () => {
    remove(id);
    router.push("/employees");
  };

  if (!ready) {
    return null;
  }

  if (!list) {
    return (
      <main className="mx-auto flex max-w-lg flex-1 items-center px-4 py-16">
        <EmptyState
          icon={FileQuestion}
          title="Список не найден"
          description="Возможно, он был удалён или ссылка неверна."
          action={
            <Link href="/employees">
              <Button variant="secondary">К спискам</Button>
            </Link>
          }
          className="w-full"
        />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link
        href="/employees"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Мои списки
      </Link>

      <PageHeader
        title={
          <Input
            value={list.name}
            onChange={(e) => updateList({ ...list, name: e.target.value })}
            className="h-auto border-0 bg-transparent p-0 text-2xl font-semibold shadow-none focus:ring-0"
            aria-label="Название списка"
          />
        }
        description="Сотрудники в этом списке"
        actions={
          <Button
            variant="danger"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            Удалить список
          </Button>
        }
      />

      {list.members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Список пуст"
          description="Добавьте сотрудников в этот список."
          action={
            <Button variant="secondary" onClick={addMember}>
              + Сотрудник
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="divide-y divide-border">
            {list.members.map((member, index) => (
              <EmployeeCard
                key={member.id}
                index={index}
                name={member.name}
                shiftType={member.shiftType}
                dutyPreferences={member.dutyPreferences}
                onNameChange={(name) => updateMember(member.id, { name })}
                onShiftTypeChange={(shiftType) =>
                  updateMember(member.id, {
                    shiftType,
                    dutyPreferences:
                      shiftType === "day" ? (member.dutyPreferences ?? []) : [],
                  })
                }
                onDutyPreferencesChange={(dutyPreferences) =>
                  updateMember(member.id, { dutyPreferences })
                }
                onRemove={() => removeMember(member.id)}
              />
            ))}
          </div>

          <div className="border-t border-border px-3 py-3">
            <Button variant="secondary" size="sm" onClick={addMember}>
              + Сотрудник
            </Button>
          </div>
        </Card>
      )}

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Удалить список?"
        description={`Список «${list.name}» и все его сотрудники будут удалены.`}
        confirmLabel="Удалить"
        variant="danger"
        onConfirm={handleDelete}
      />
    </main>
  );
}
