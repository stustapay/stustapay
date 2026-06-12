import { EventPrivilege, NodePrivilege } from "@stustapay/models";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export function usePrivilegeTranslations() {
  const { t } = useTranslation();

  const getPrivilegeName = useCallback(
    (privilege: EventPrivilege | NodePrivilege): string => {
      return t(`privilege.types.${privilege}.name`);
    },
    [t]
  );

  const getPrivilegeDescription = useCallback(
    (privilege: EventPrivilege | NodePrivilege): string => {
      return t(`privilege.types.${privilege}.description`);
    },
    [t]
  );

  return { getPrivilegeName, getPrivilegeDescription };
}
