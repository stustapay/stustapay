import { selectCurrentUser, useAppSelector } from "@/store";

export const useCurrentUser = () => {
  const currentUser = useAppSelector(selectCurrentUser);
  return currentUser;
}