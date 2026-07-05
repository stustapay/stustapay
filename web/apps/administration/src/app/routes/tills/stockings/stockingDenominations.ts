import { CashRegisterStocking, NewCashRegisterStocking } from "@/api";

export type CashRegisterStockingDenominationField = (typeof cashRegisterStockingDenominationFields)[number];

export type CashRegisterStockingDenomination = {
  field: CashRegisterStockingDenominationField;
  labelKey: `register.denominations.${CashRegisterStockingDenominationField}`;
  valuePerUnit: number;
};

export type StockingDenominationRow = {
  id: string;
  field: CashRegisterStockingDenominationField | "variable_in_euro";
  labelKey: string;
  valuePerUnit: number | null;
  quantity: number | null;
  amount: number;
};

export const cashRegisterStockingDenominationFields = [
  "euro200",
  "euro100",
  "euro50",
  "euro20",
  "euro10",
  "euro5",
  "euro2",
  "euro1",
  "cent50",
  "cent20",
  "cent10",
  "cent5",
  "cent2",
  "cent1",
] as const satisfies ReadonlyArray<keyof CashRegisterStocking>;

export const cashRegisterStockingDenominations: CashRegisterStockingDenomination[] = [
  { field: "euro200", labelKey: "register.denominations.euro200", valuePerUnit: 200 },
  { field: "euro100", labelKey: "register.denominations.euro100", valuePerUnit: 100 },
  { field: "euro50", labelKey: "register.denominations.euro50", valuePerUnit: 50 },
  { field: "euro20", labelKey: "register.denominations.euro20", valuePerUnit: 20 },
  { field: "euro10", labelKey: "register.denominations.euro10", valuePerUnit: 10 },
  { field: "euro5", labelKey: "register.denominations.euro5", valuePerUnit: 5 },
  { field: "euro2", labelKey: "register.denominations.euro2", valuePerUnit: 50 },
  { field: "euro1", labelKey: "register.denominations.euro1", valuePerUnit: 25 },
  { field: "cent50", labelKey: "register.denominations.cent50", valuePerUnit: 20 },
  { field: "cent20", labelKey: "register.denominations.cent20", valuePerUnit: 8 },
  { field: "cent10", labelKey: "register.denominations.cent10", valuePerUnit: 4 },
  { field: "cent5", labelKey: "register.denominations.cent5", valuePerUnit: 2.5 },
  { field: "cent2", labelKey: "register.denominations.cent2", valuePerUnit: 1 },
  { field: "cent1", labelKey: "register.denominations.cent1", valuePerUnit: 0.5 },
];

export const defaultCashRegisterStockingDenominationValues = Object.fromEntries(
  cashRegisterStockingDenominationFields.map((field) => [field, 0])
) as Record<CashRegisterStockingDenominationField, number>;

type StockingDenominationValues = Pick<
  NewCashRegisterStocking,
  CashRegisterStockingDenominationField | "variable_in_euro"
>;

export const buildStockingDenominationRows = (
  values: StockingDenominationValues,
  options?: { hideZero?: boolean }
): StockingDenominationRow[] => {
  const rows: StockingDenominationRow[] = cashRegisterStockingDenominations.map(({ field, labelKey, valuePerUnit }) => {
    const quantity = values[field] ?? 0;
    return {
      id: field,
      field,
      labelKey,
      valuePerUnit,
      quantity,
      amount: quantity * valuePerUnit,
    };
  });

  const variableAmount = values.variable_in_euro ?? 0;
  rows.push({
    id: "variable_in_euro",
    field: "variable_in_euro",
    labelKey: "register.denominations.variable",
    valuePerUnit: null,
    quantity: null,
    amount: variableAmount,
  });

  if (options?.hideZero) {
    return rows.filter((row) => (row.field === "variable_in_euro" ? row.amount !== 0 : (row.quantity ?? 0) > 0));
  }

  return rows;
};

export const computeStockingTotal = (values: StockingDenominationValues) =>
  buildStockingDenominationRows(values).reduce((sum, row) => sum + row.amount, 0);

export const getStockingDenominationRows = (stocking: CashRegisterStocking) =>
  buildStockingDenominationRows(stocking, { hideZero: true });
