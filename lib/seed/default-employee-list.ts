import type { EmployeeList, ShiftType } from "@/lib/types";
import { generateId } from "@/lib/utils";

export const DEFAULT_EMPLOYEE_LIST_ID = "default-oar-2";

const DAY_WORKERS = [
  "Марьясова М.А.",
  "Михайлова М.А.",
  "Васильченко В.Д.",
  "Большакова Е.В.",
  "Иванова С.К.",
  "Никитина Н.В.",
];

const NIGHT_WORKERS = [
  "Кербс В.А.",
  "Дешин И.Н.",
  "Аравин Д.Е.",
  "Курбатов В.",
  "Кучин А.С.",
  "Кучина О.В.",
  "Малофеев И.В.",
  "Митина Ю.В.",
  "Мухайло Д.В.",
  "Нагибина Н.А.",
  "Новиков Т.П.",
  "Перелыгина А.Н.",
  "Федорищев А.Ю.",
  "Хмарская К.О.",
  "Шноркин Д.В.",
  "Яковлев И.А.",
  "Баракин Д.",
];

function createMember(name: string, shiftType: ShiftType) {
  return { id: generateId(), name, shiftType, dutyPreferences: [] };
}

export const DEFAULT_EMPLOYEE_LIST: EmployeeList = {
  id: DEFAULT_EMPLOYEE_LIST_ID,
  name: "Младший мед персонал",
  members: [
    ...DAY_WORKERS.map((name) => createMember(name, "day")),
    ...NIGHT_WORKERS.map((name) => createMember(name, "night")),
  ],
};
