export const formatDate = (date: string | undefined): string | undefined => {
  return date && new Date(date).toLocaleString("de-DE");
};
