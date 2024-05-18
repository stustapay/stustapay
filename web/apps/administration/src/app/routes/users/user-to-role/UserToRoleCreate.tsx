import { NewUserToRoles, useUpdateUserToRolesMutation } from "@/api";
import { UserToRoleRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { withPrivilegeGuard } from "@/app/layout";
import { z } from "zod";
import { FormikProps } from "formik";
import { UserSelect, RoleSelect } from "@/components/features";

const NewUserToRoleSchema = z.object({
  user_id: z.number().int(),
  role_ids: z.array(z.number().int()),
});

const UserToRoleCreateForm: React.FC<FormikProps<NewUserToRoles>> = ({ values, errors, setFieldValue, touched }) => {
  const { t } = useTranslation();
  return (
    <>
      <UserSelect
        label={t("user.user")}
        value={values.user_id}
        onChange={(val) => setFieldValue("user_id", val)}
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
      submitLabel={t("add")}
      successRoute={UserToRoleRoutes.list()}
      onSubmit={(u) => createUserToRole({ nodeId: currentNode.id, newUserToRoles: u })}
      form={UserToRoleCreateForm}
    />
  );
});
