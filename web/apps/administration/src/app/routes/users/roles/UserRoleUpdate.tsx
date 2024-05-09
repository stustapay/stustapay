import { selectUserRoleById, useListUserRolesQuery, useUpdateUserRoleMutation } from "@/api";
import { UserRoleRoutes } from "@/app/routes";
import { EditLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { UserRoleUpdateForm, UserRoleUpdateSchema, UserRoleUpdate as UserRoleUpdateType } from "./UserRoleUpdateForm";
import { withPrivilegeGuard } from "@/app/layout";
import { toast } from "react-toastify";

export const UserRoleUpdate: React.FC = withPrivilegeGuard("user_management", () => {
  const { t } = useTranslation();
  const { roleId } = useParams();
  const { currentNode } = useCurrentNode();
  const [updateUserRole] = useUpdateUserRoleMutation();
  const { userRole, isLoading } = useListUserRolesQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        userRole: data ? selectUserRoleById(data, Number(roleId)) : undefined,
      }),
    }
  );

  if (isLoading) {
    return <Loading />;
  }

  if (!userRole) {
    toast.error("error loading user role");
    return <Loading />;
  }

  return (
    <EditLayout
      title={t("userRole.update")}
      submitLabel={t("update")}
      successRoute={UserRoleRoutes.list()}
      initialValues={userRole as UserRoleUpdateType}
      validationSchema={UserRoleUpdateSchema}
      onSubmit={(u) =>
        updateUserRole({ nodeId: currentNode.id, userRoleId: userRole.id, updateUserRolePrivilegesPayload: u })
      }
      form={UserRoleUpdateForm}
    />
  );
});
