import { getAvailableTerminalUserIds } from "./terminalUserAvailability";

describe("getAvailableTerminalUserIds", () => {
  test("filters out users active on other returned terminals", () => {
    const userIds = [11, 12, 13, 14];
    const terminals = [
      { id: 100, active_user_id: 11 }, // current terminal
      { id: 101, active_user_id: 12 }, // another returned terminal
      { id: 102, active_user_id: null }, // free terminal
      { id: 103, active_user_id: 14 }, // another returned terminal
    ];

    expect(getAvailableTerminalUserIds(userIds, terminals, 100)).toEqual([11, 13]);
  });

  test("keeps all users when no other terminal has an active user", () => {
    const userIds = [1, 2, 3];
    const terminals = [{ id: 200, active_user_id: null }, { id: 201, active_user_id: null }];

    expect(getAvailableTerminalUserIds(userIds, terminals, 200)).toEqual([1, 2, 3]);
  });
});
