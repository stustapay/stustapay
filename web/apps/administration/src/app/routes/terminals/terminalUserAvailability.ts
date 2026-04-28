export type TerminalUserAssignment = {
  id: number;
  active_user_id?: number | null;
};

export const getAvailableTerminalUserIds = (
  userIds: number[],
  terminals: TerminalUserAssignment[],
  terminalId: number
): number[] => {
  const currentTerminal = terminals.find((t) => t.id === terminalId);
  const loggedInUsers = new Set<number>();
  for (const terminal of terminals) {
    if (terminal.id !== terminalId && terminal.active_user_id) {
      loggedInUsers.add(terminal.active_user_id);
    }
  }

  return userIds.filter((userId) => {
    if (currentTerminal?.active_user_id === userId) {
      return true;
    }
    return !loggedInUsers.has(userId);
  });
};
