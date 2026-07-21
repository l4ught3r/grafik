import {
  type BalanceInput,
  getPools,
  MAX_BALANCE_ITERATIONS,
} from "@/lib/balance-pools";
import { balancePool } from "@/lib/balance-transfer";
import type { Schedule } from "@/lib/types";

export type { BalanceInput } from "@/lib/balance-pools";
export { balanceSpacing } from "@/lib/balance-spacing";

/**
 * Мутирует переданный объект cells in-place для производительности.
 * НЕ передавайте live React state — только свежий объект из initCells().
 */
export function balanceScheduleCells(
  input: BalanceInput,
  cells: Schedule["cells"],
): void {
  const { year, month, employees, calendar, coverage, lockedCells } = input;
  const pools = getPools(employees);

  for (let iteration = 0; iteration < MAX_BALANCE_ITERATIONS; iteration++) {
    let improved = false;

    for (const pool of pools) {
      if (
        balancePool(
          pool,
          calendar,
          cells,
          year,
          month,
          coverage,
          employees,
          lockedCells,
        )
      ) {
        improved = true;
      }
    }

    if (!improved) break;
  }
}
