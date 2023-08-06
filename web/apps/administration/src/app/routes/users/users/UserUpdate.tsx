import { useGetUserQuery, useUpdateUserMutation } from "@/api";
import { UserRoutes } from "@/app/routes";
import { EditLayout } from "@components";
import { Loading } from "@stustapay/components";
import { UserSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { UserUpdateForm } from "./UserUpdateForm";

export const UserUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { userId } = useParams();
  const [updateUser] = useUpdateUserMutation();
  const { data: user, isLoading } = useGetUserQuery({ userId: Number(userId) });

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
      onSubmit={(u) => updateUser({ userId: user.id, updateUserPayload: u })}
      form={UserUpdateForm}
    />
  );
};
