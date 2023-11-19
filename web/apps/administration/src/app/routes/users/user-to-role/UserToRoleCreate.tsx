import { NewUserToRole, useAssociatedUserToRoleMutation } from "@/api";
import { UserToRoleRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { FormikProps } from "formik";
import { UserSelect, RoleSelect } from "@/components/features";

const NewUserToRoleSchema = z.object({
  user_id: z.number().int(),
  role_id: z.number().int(),
});

const UserToRoleCreateForm: React.FC<FormikProps<NewUserToRole>> = ({ values, errors, setFieldValue, touched }) => {
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
        value={values.role_id}
        onChange={(val) => setFieldValue("role_id", val)}
        error={touched.role_id && !!errors.role_id}
        helperText={(touched.role_id && errors.role_id) as string}
      />
    </>
  );
};

const initialValues: NewUserToRole = {
  user_id: undefined as unknown as number, // to circument typescript,
  role_id: undefined as unknown as number, // to circument typescript,
};

export const UserToRoleCreate: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [createUserToRole] = useAssociatedUserToRoleMutation();

  return (
    <CreateLayout
      title={t("userToRole.create", { node: currentNode.name })}
      initialValues={initialValues}
      validationSchema={NewUserToRoleSchema}
      submitLabel={t("add")}
      successRoute={UserToRoleRoutes.list()}
      onSubmit={(u) => createUserToRole({ nodeId: currentNode.id, newUserToRole: u })}
      form={UserToRoleCreateForm}
    />
  );
};
