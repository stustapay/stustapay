export const formatUserTagUid = (uid?: string | null): string => {
  return uid ? (uid.startsWith("0x") ? uid.slice(2).toUpperCase() : uid.toUpperCase()) : "";
};
