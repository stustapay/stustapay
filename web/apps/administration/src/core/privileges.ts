import { Privilege } from "@/api";

export type PrivilegeRequirement = Privilege | Privilege[];

export const normalizePrivilegeRequirement = (privilege?: PrivilegeRequirement): Privilege[] => {
  if (privilege == null) {
    return [];
  }

  return Array.isArray(privilege) ? privilege : [privilege];
};

export const hasAnyPrivilege = (
  availablePrivileges: Privilege[],
  requiredPrivileges?: PrivilegeRequirement
): boolean => {
  const required = normalizePrivilegeRequirement(requiredPrivileges);
  if (required.length === 0) {
    return true;
  }

  return required.some((privilege) => availablePrivileges.includes(privilege));
};

export const hasAllPrivileges = (
  availablePrivileges: Privilege[],
  requiredPrivileges?: PrivilegeRequirement
): boolean => {
  const required = normalizePrivilegeRequirement(requiredPrivileges);
  if (required.length === 0) {
    return true;
  }

  return required.every((privilege) => availablePrivileges.includes(privilege));
};
