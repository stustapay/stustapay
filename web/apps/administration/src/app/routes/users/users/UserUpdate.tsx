import { Loading } from "@stustapay/components";
import { UserSchema } from "@stustapay/models";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

import { withPrivilegeGuard } from "@/app/layout";
import { UserRoutes } from "@/app/routes";
import { EditLayoutV2 } from "@/components";
import { getUserCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { UserUpdateForm } from "./UserUpdateForm";

export const UserUpdate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { userId } = useParams();
  const {
    data: user,
    isLoading,
    isError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ users: getUserCollection(currentNode.id) })
        .where(({ users }) => eq(users.id, Number(userId)))
        .findOne(),
    [currentNode.id, userId]
  );

  if (isError) {
    return <Navigate to={UserRoutes.list()} />;
  }

  if (isLoading || !user) {
    return <Loading />;
  }

  return (
    <EditLayoutV2
      title={t("updateUser")}
      successRoute={UserRoutes.detail(user.id)}
      initialValues={user}
      validationSchema={UserSchema}
      onSubmit={(updatedUser) =>
        getUserCollection(currentNode.id).update(user.id, (draft) => {
          draft.login = updatedUser.login;
          draft.display_name = updatedUser.display_name;
          draft.description = updatedUser.description;
          draft.user_tag_pin = updatedUser.user_tag_pin ?? null;
          draft.user_tag_uid_hex = updatedUser.user_tag_uid_hex ?? null;
        })
      }
      form={UserUpdateForm}
    />
  );
});
