export const formatUserTagUid = (uid: bigint | null): string => {
  return uid ? uid.toString(16) : "";
};
