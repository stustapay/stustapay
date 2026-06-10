import { FormikProps } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { NewUserToRoles, useListUserToRoleQuery, useUpdateUserToRolesMutation } from "@/api";
import { withPrivilegeGuard } from "@/app/layout";
import { UserToRoleRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { UserSelect, RoleSelect } from "@/components/features";
import { useCurrentNode } from "@/hooks";

const NewUserToRoleSchema = z.object({
  user_id: z.number().int(),
  role_ids: z.array(z.number().int()),
});

const UserToRoleCreateForm: React.FC<FormikProps<NewUserToRoles>> = ({ values, errors, setFieldValue, touched }) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { data: userToRoles } = useListUserToRoleQuery({ nodeId: currentNode.id });

  const changeUserId = React.useCallback(
    (userId: number | undefined) => {
      if (!userToRoles) {
        return;
      }
      setFieldValue("user_id", userId);
      if (userId != null) {
        const userRoles = userToRoles.find((u) => u.node_id === currentNode.id && u.user_id === userId);
        console.log("user roles", userRoles);
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
    </>
  );
};

const initialValues: NewUserToRoles = {
  user_id: undefined as unknown as number, // to circument typescript,
  role_ids: [],
};

export const UserToRoleCreate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [createUserToRole] = useUpdateUserToRolesMutation();

  return (
    <CreateLayout
      title={t("userToRole.create", { node: currentNode.name })}
      initialValues={initialValues}
      validationSchema={NewUserToRoleSchema}
      successRoute={UserToRoleRoutes.list()}
      onSubmit={(u) => createUserToRole({ nodeId: currentNode.id, newUserToRoles: u })}
      form={UserToRoleCreateForm}
    />
  );
});
