import { getEmployeeList, saveEmployeeList } from "@/lib/storage";
import type { EmployeeListMember, ScheduleEmployee } from "@/lib/types";
import { sortByName } from "@/lib/utils";

export function syncEmployeesToList(
  listId: string,
  employees: ScheduleEmployee[],
): { ok: true; updated: number; added: number } | { ok: false; error: string } {
  const list = getEmployeeList(listId);
  if (!list) {
    return { ok: false, error: "Список не найден" };
  }

  const memberIds = new Set(list.members.map((member) => member.id));
  let updated = 0;

  const updatedMembers = list.members.map((member) => {
    const employee = employees.find((e) => e.id === member.id);
    if (!employee) return member;

    updated += 1;
    return {
      ...member,
      name: employee.name.trim(),
      shiftType: employee.shiftType,
      dutyPreferences: employee.dutyPreferences ?? [],
    };
  });

  const addedMembers: EmployeeListMember[] = [];
  for (const employee of employees) {
    if (memberIds.has(employee.id)) continue;
    const name = employee.name.trim();
    if (!name) continue;

    addedMembers.push({
      id: employee.id,
      name,
      shiftType: employee.shiftType,
      dutyPreferences: employee.dutyPreferences ?? [],
    });
  }

  const members = sortByName([...updatedMembers, ...addedMembers]);
  const { result } = saveEmployeeList({ ...list, members });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true, updated, added: addedMembers.length };
}
