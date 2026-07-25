import { Loading } from "@stustapay/components";
import { useLiveQuery } from "@tanstack/react-db";
import { FormikProps } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { z } from "zod";

import { withPrivilegeGuard } from "@/app/layout";
import { UserToRoleRoutes } from "@/app/routes";
import { CreateLayoutV2 } from "@/components";
import { RoleSelect, UserSelect } from "@/components/features";
import type { NewUserToRoles } from "@/db/api/generated/types.gen";
import { getUserToRoleCollection, getUserToRoleKey } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { UserRoleAssignmentsSection } from "./UserRoleAssignmentsSection";

const UserToRoleSchema = z.object({
  user_id: z.number().int(),
  role_ids: z.array(z.number().int()),
});

const emptyInitialValues: NewUserToRoles = {
  user_id: undefined as unknown as number,
  role_ids: [],
};

const UserToRoleForm: React.FC<FormikProps<NewUserToRoles>> = ({ values, errors, setFieldValue, touched }) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { data: userToRoles } = useLiveQuery(
    (q) => q.from({ userToRoles: getUserToRoleCollection(currentNode.id) }),
    [currentNode.id]
  );

  const changeUserId = React.useCallback(
    (userId: number | undefined) => {
      if (!userToRoles) {
        return;
      }
      setFieldValue("user_id", userId);
      if (userId != null) {
        const userRoles = userToRoles.find((u) => u.node_id === currentNode.id && u.user_id === userId);
        if (userRoles) {
          setFieldValue("role_ids", userRoles.role_ids);
        } else {
          setFieldValue("role_ids", []);
        }
      }
    },
    [userToRoles, setFieldValue, currentNode.id]
  );

  return (
    <>
      <UserSelect
        label={t("user.user")}
        value={values.user_id}
        onChange={changeUserId}
        error={touched.user_id && !!errors.user_id}
        helperText={(touched.user_id && errors.user_id) as string}
      />
      <RoleSelect
        label={t("user.roles")}
        value={values.role_ids}
        onChange={(val) => setFieldValue("role_ids", val)}
        error={touched.role_ids && !!errors.role_ids}
        helperText={(touched.role_ids && errors.role_ids) as string}
      />
      {values.user_id > 0 && <UserRoleAssignmentsSection userId={values.user_id} />}
    </>
  );
};

export const UserToRoleUpdate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { userId: userIdParam } = useParams();
  const userIdFromRoute = userIdParam != null ? Number(userIdParam) : undefined;
  const isEditMode = userIdFromRoute != null && Number.isFinite(userIdFromRoute);
  const { data: userToRolesList, isLoading } = useLiveQuery(
    (q) => q.from({ userToRoles: getUserToRoleCollection(currentNode.id) }),
    [currentNode.id]
  );

  if (isEditMode && isLoading) {
    return <Loading />;
  }

  const initialValues: NewUserToRoles = isEditMode
    ? (() => {
        const existing = userToRolesList?.find((u) => u.node_id === currentNode.id && u.user_id === userIdFromRoute);
        return {
          user_id: userIdFromRoute,
          role_ids: existing?.role_ids ?? [],
        };
      })()
    : emptyInitialValues;

  return (
    <CreateLayoutV2
      title={t("userToRole.create", { node: currentNode.name })}
      initialValues={initialValues}
      validationSchema={UserToRoleSchema}
      successRoute={UserToRoleRoutes.list()}
      onSubmit={(u) => {
        const collection = getUserToRoleCollection(currentNode.id);
        const key = getUserToRoleKey(currentNode.id, u.user_id);
        if (collection.has(key)) {
          if (u.role_ids.length === 0) {
            return collection.delete(key);
          }
          return collection.update(key, (draft) => {
            draft.role_ids = u.role_ids;
          });
        }
        return collection.insert({
          user_id: u.user_id,
          role_ids: u.role_ids,
          node_id: currentNode.id,
        });
      }}
      form={UserToRoleForm}
    />
  );
});
