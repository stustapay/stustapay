export const USER_TAG_GRID_FIELDS = ["pin", "uid", "is_vip", "comment", "group_tag"] as const;

export type UserTagGridField = (typeof USER_TAG_GRID_FIELDS)[number];

export type UserTagGridRow = {
  id: string;
  pin: string;
  uid: string;
  is_vip: string;
  comment: string;
  group_tag: string;
};

export type UserTagGridIssue = {
  rowIndex?: number;
  field?: UserTagGridField;
  messageKey: string;
};

export type ParsedUserTagGridRow = {
  pin: string;
  uid?: number;
  is_vip?: boolean;
  comment?: string;
  group_tag?: string;
};

let nextUserTagGridRowId = 0;

const trimmedValue = (value: string | null | undefined) => value?.trim() ?? "";

export const createEmptyUserTagGridRow = (): UserTagGridRow => ({
  id: `user-tag-grid-row-${nextUserTagGridRowId++}`,
  pin: "",
  uid: "",
  is_vip: "",
  comment: "",
  group_tag: "",
});

export const createUserTagGridRows = (
  rows: Array<Partial<Omit<UserTagGridRow, "id">> | ParsedUserTagGridRow>
): UserTagGridRow[] => rows.map(createUserTagGridRow);

export const createUserTagGridRow = (
  row: Partial<Omit<UserTagGridRow, "id">> | ParsedUserTagGridRow
): UserTagGridRow => ({
  id: `user-tag-grid-row-${nextUserTagGridRowId++}`,
  pin: trimmedValue(row.pin),
  uid: row.uid == null ? trimmedValue((row as Partial<UserTagGridRow>).uid) : String(row.uid),
  is_vip:
    typeof row.is_vip === "boolean"
      ? row.is_vip
        ? "true"
        : "false"
      : trimmedValue((row as Partial<UserTagGridRow>).is_vip),
  comment: trimmedValue(row.comment),
  group_tag: trimmedValue(row.group_tag),
});

export const normalizeUserTagGridRow = (row: UserTagGridRow): UserTagGridRow => ({
  ...row,
  pin: trimmedValue(row.pin),
  uid: trimmedValue(row.uid),
  is_vip: trimmedValue(row.is_vip),
  comment: trimmedValue(row.comment),
  group_tag: trimmedValue(row.group_tag),
});

export const isUserTagGridRowEmpty = (row: UserTagGridRow) =>
  USER_TAG_GRID_FIELDS.every((field) => trimmedValue(row[field]) === "");

export const addEmptyUserTagGridRows = (rows: UserTagGridRow[], count: number) => [
  ...rows,
  ...Array.from({ length: count }, () => createEmptyUserTagGridRow()),
];

export const removeEmptyUserTagGridRows = (rows: UserTagGridRow[]) => {
  const filtered = rows.filter((row) => !isUserTagGridRowEmpty(row));
  return filtered.length > 0 ? filtered : [createEmptyUserTagGridRow()];
};

export const parseUserTagUidInput = (
  rawValue: string
): { value?: number; errorKey?: "userTag.gridErrors.uidInvalid" } => {
  const value = trimmedValue(rawValue);
  if (value === "") {
    return {};
  }

  let parsed: number | undefined;
  if (/^0x[0-9a-f]+$/i.test(value)) {
    parsed = Number.parseInt(value, 16);
  } else if (/^[0-9]+$/.test(value)) {
    parsed = Number.parseInt(value, 10);
  } else if (/^[0-9a-f]+$/i.test(value)) {
    parsed = Number.parseInt(value, 16);
  }

  if (parsed == null || Number.isNaN(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    return { errorKey: "userTag.gridErrors.uidInvalid" };
  }

  return { value: parsed };
};

export const parseUserTagVipInput = (
  rawValue: string
): { value?: boolean; errorKey?: "userTag.gridErrors.vipInvalid" } => {
  const value = trimmedValue(rawValue).toLowerCase();
  if (value === "") {
    return {};
  }

  if (["true", "1", "yes", "ja", "y"].includes(value)) {
    return { value: true };
  }

  if (["false", "0", "no", "nein", "n"].includes(value)) {
    return { value: false };
  }

  return { errorKey: "userTag.gridErrors.vipInvalid" };
};

export const collectUserTagGridIssues = (rows: UserTagGridRow[]): UserTagGridIssue[] => {
  const issues: UserTagGridIssue[] = [];
  const normalizedRows = rows.map(normalizeUserTagGridRow);
  /** Same PIN with no UID (pre-activation stock): at most one per PIN in the import grid */
  const pinRowsWithoutUid = new Map<string, number[]>();
  /** Duplicate (pin, uid) pairs when UID is set */
  const pinUidPairRows = new Map<string, number[]>();
  const uidOccurrences = new Map<number, number[]>();
  let hasNonEmptyRow = false;

  normalizedRows.forEach((row, rowIndex) => {
    if (isUserTagGridRowEmpty(row)) {
      return;
    }

    hasNonEmptyRow = true;

    if (row.pin === "") {
      issues.push({ rowIndex, field: "pin", messageKey: "userTag.gridErrors.pinRequired" });
    }

    const parsedUid = parseUserTagUidInput(row.uid);
    if (parsedUid.errorKey) {
      issues.push({ rowIndex, field: "uid", messageKey: parsedUid.errorKey });
    } else if (parsedUid.value != null) {
      if (row.pin !== "") {
        const pairKey = `${row.pin}\u0000${parsedUid.value}`;
        const pairRows = pinUidPairRows.get(pairKey) ?? [];
        pairRows.push(rowIndex);
        pinUidPairRows.set(pairKey, pairRows);
      }
      const existingUidRows = uidOccurrences.get(parsedUid.value) ?? [];
      existingUidRows.push(rowIndex);
      uidOccurrences.set(parsedUid.value, existingUidRows);
    } else if (row.pin !== "" && !parsedUid.errorKey) {
      const rowsForPin = pinRowsWithoutUid.get(row.pin) ?? [];
      rowsForPin.push(rowIndex);
      pinRowsWithoutUid.set(row.pin, rowsForPin);
    }

    const parsedVip = parseUserTagVipInput(row.is_vip);
    if (parsedVip.errorKey) {
      issues.push({ rowIndex, field: "is_vip", messageKey: parsedVip.errorKey });
    }
  });

  if (!hasNonEmptyRow) {
    issues.push({ messageKey: "userTag.gridErrors.noRows" });
  }

  pinRowsWithoutUid.forEach((rowIndexes) => {
    if (rowIndexes.length < 2) {
      return;
    }
    rowIndexes.forEach((rowIndex) => {
      issues.push({ rowIndex, field: "pin", messageKey: "userTag.gridErrors.duplicatePin" });
    });
  });

  pinUidPairRows.forEach((rowIndexes) => {
    if (rowIndexes.length < 2) {
      return;
    }
    rowIndexes.forEach((rowIndex) => {
      issues.push({ rowIndex, field: "pin", messageKey: "userTag.gridErrors.duplicatePinUid" });
    });
  });

  uidOccurrences.forEach((rowIndexes) => {
    if (rowIndexes.length < 2) {
      return;
    }
    rowIndexes.forEach((rowIndex) => {
      issues.push({ rowIndex, field: "uid", messageKey: "userTag.gridErrors.duplicateUid" });
    });
  });

  return issues;
};

export const serializeUserTagGridRows = (rows: UserTagGridRow[]): ParsedUserTagGridRow[] =>
  rows
    .map(normalizeUserTagGridRow)
    .filter((row) => !isUserTagGridRowEmpty(row))
    .map((row) => {
      const parsedUid = parseUserTagUidInput(row.uid);
      const parsedVip = parseUserTagVipInput(row.is_vip);

      return {
        pin: row.pin,
        uid: parsedUid.value,
        is_vip: parsedVip.value,
        comment: row.comment || undefined,
        group_tag: row.group_tag || undefined,
      };
    });

export const parseSpreadsheetClipboard = (clipboardText: string): string[][] => {
  const lines = clipboardText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const rows = lines.map((line) => line.split("\t").map((cell) => cell.trim()));

  while (rows.length > 0 && rows[rows.length - 1].every((cell) => cell === "")) {
    rows.pop();
  }

  const hasTabs = clipboardText.includes("\t");
  if (!hasTabs) {
    const nonEmptyRows = rows.filter((row) => row.some((cell) => cell !== ""));
    const whitespaceSeparatedRows = nonEmptyRows.map((row) => row[0]?.trim().split(/\s+/).filter(Boolean) ?? []);

    if (
      whitespaceSeparatedRows.length > 0 &&
      whitespaceSeparatedRows.every((row) => row.length === 2)
    ) {
      return whitespaceSeparatedRows;
    }
  }

  return rows;
};

export const applyUserTagGridPaste = (
  rows: UserTagGridRow[],
  startRowIndex: number,
  startField: UserTagGridField,
  clipboardText: string
): UserTagGridRow[] => {
  const pastedRows = parseSpreadsheetClipboard(clipboardText);
  if (pastedRows.length === 0) {
    return rows;
  }

  const nextRows = [...rows];
  while (nextRows.length < startRowIndex + pastedRows.length) {
    nextRows.push(createEmptyUserTagGridRow());
  }

  const startColumnIndex = USER_TAG_GRID_FIELDS.indexOf(startField);
  if (startColumnIndex === -1) {
    return rows;
  }

  pastedRows.forEach((pastedRow, pastedRowIndex) => {
    const targetRow = nextRows[startRowIndex + pastedRowIndex];
    const nextRow = { ...targetRow };

    pastedRow.forEach((cellValue, pastedColumnIndex) => {
      const field = USER_TAG_GRID_FIELDS[startColumnIndex + pastedColumnIndex];
      if (!field) {
        return;
      }
      nextRow[field] = cellValue.trim();
    });

    nextRows[startRowIndex + pastedRowIndex] = nextRow;
  });

  return nextRows;
};
