import { useGetUserQuery, useUpdateUserMutation } from "@/api";
import { UserRoutes } from "@/app/routes";
import { EditLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Loading } from "@stustapay/components";
import { UserSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { UserUpdateForm } from "./UserUpdateForm";
import { withPrivilegeGuard } from "@/app/layout";

export const UserUpdate: React.FC = withPrivilegeGuard("user_management", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { userId } = useParams();
  const [updateUser] = useUpdateUserMutation();
  const { data: user, isLoading } = useGetUserQuery({ nodeId: currentNode.id, userId: Number(userId) });

  if (isLoading) {
    return <Loading />;
  }

  if (!user) {
    return <Loading />;
  }

  return (
    <EditLayout
      title={t("updateUser")}
      submitLabel={t("update")}
      successRoute={UserRoutes.detail(user.id)}
      initialValues={user}
      validationSchema={UserSchema}
      onSubmit={(u) => updateUser({ nodeId: currentNode.id, userId: user.id, updateUserPayload: u })}
      form={UserUpdateForm}
    />
  );
});
