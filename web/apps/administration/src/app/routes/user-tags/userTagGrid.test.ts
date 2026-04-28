import {
  applyUserTagGridPaste,
  collectUserTagGridIssues,
  createEmptyUserTagGridRow,
  parseSpreadsheetClipboard,
  parseUserTagUidInput,
  parseUserTagVipInput,
} from "./userTagGrid";

describe("userTagGrid helpers", () => {
  test("parses decimal and hexadecimal UIDs", () => {
    expect(parseUserTagUidInput("12345")).toEqual({ value: 12345 });
    expect(parseUserTagUidInput("0x1A")).toEqual({ value: 26 });
    expect(parseUserTagUidInput("1A")).toEqual({ value: 26 });
  });

  test("rejects invalid UID values", () => {
    expect(parseUserTagUidInput("not-a-uid")).toEqual({ errorKey: "userTag.gridErrors.uidInvalid" });
  });

  test("parses allowed VIP values", () => {
    expect(parseUserTagVipInput("true")).toEqual({ value: true });
    expect(parseUserTagVipInput("0")).toEqual({ value: false });
    expect(parseUserTagVipInput("ja")).toEqual({ value: true });
    expect(parseUserTagVipInput("nein")).toEqual({ value: false });
  });

  test("ignores trailing empty spreadsheet rows", () => {
    expect(parseSpreadsheetClipboard("pin1\tuid1\npin2\tuid2\n\n")).toEqual([
      ["pin1", "uid1"],
      ["pin2", "uid2"],
    ]);
  });

  test("parses whitespace-separated pin/uid rows without tabs", () => {
    expect(parseSpreadsheetClipboard("729466 0466D87AC87B80\n738852 04EEE2EA837A80\n")).toEqual([
      ["729466", "0466D87AC87B80"],
      ["738852", "04EEE2EA837A80"],
    ]);
  });

  test("applies pasted tabular data starting at the focused cell", () => {
    const rows = [createEmptyUserTagGridRow()];
    const updatedRows = applyUserTagGridPaste(rows, 0, "pin", "pin-1\t0x1A\npin-2\t42");

    expect(updatedRows).toHaveLength(2);
    expect(updatedRows[0].pin).toBe("pin-1");
    expect(updatedRows[0].uid).toBe("0x1A");
    expect(updatedRows[1].pin).toBe("pin-2");
    expect(updatedRows[1].uid).toBe("42");
  });

  test("reports duplicate (pin, uid) pairs and duplicate UIDs", () => {
    const rowOne = createEmptyUserTagGridRow();
    rowOne.pin = "pin-1";
    rowOne.uid = "0x1A";

    const rowTwo = createEmptyUserTagGridRow();
    rowTwo.pin = "pin-1";
    rowTwo.uid = "26";

    const issues = collectUserTagGridIssues([rowOne, rowTwo]);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rowIndex: 0, field: "pin", messageKey: "userTag.gridErrors.duplicatePinUid" }),
        expect.objectContaining({ rowIndex: 1, field: "pin", messageKey: "userTag.gridErrors.duplicatePinUid" }),
        expect.objectContaining({ rowIndex: 0, field: "uid", messageKey: "userTag.gridErrors.duplicateUid" }),
        expect.objectContaining({ rowIndex: 1, field: "uid", messageKey: "userTag.gridErrors.duplicateUid" }),
      ])
    );
  });

  test("allows the same PIN when UIDs differ", () => {
    const rowOne = createEmptyUserTagGridRow();
    rowOne.pin = "same-pin";
    rowOne.uid = "100";

    const rowTwo = createEmptyUserTagGridRow();
    rowTwo.pin = "same-pin";
    rowTwo.uid = "200";

    const issues = collectUserTagGridIssues([rowOne, rowTwo]);
    const dupPin = issues.filter((i) => i.messageKey === "userTag.gridErrors.duplicatePin");
    const dupPair = issues.filter((i) => i.messageKey === "userTag.gridErrors.duplicatePinUid");
    expect(dupPin).toHaveLength(0);
    expect(dupPair).toHaveLength(0);
  });
});
