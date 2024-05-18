import { NewUserToRoles, useListUserToRoleQuery, useUpdateUserToRolesMutation } from "@/api";
import { UserToRoleRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { FormikProps } from "formik";
import { RoleSelect } from "@/components/features";
import { withPrivilegeGuard } from "@/app/layout";
import { useParams } from "react-router-dom";
import { Loading } from "@stustapay/components";

const UpdateUserToRolesSchema = z.object({
  user_id: z.number().int(),
  role_ids: z.array(z.number().int()),
});

const UserToRoleUpdateForm: React.FC<FormikProps<NewUserToRoles>> = ({ values, errors, setFieldValue, touched }) => {
  const { t } = useTranslation();
  return (
    <RoleSelect
      label={t("user.roles")}
      value={values.role_ids}
      onChange={(val) => setFieldValue("role_ids", val)}
      error={touched.role_ids && !!errors.role_ids}
      helperText={(touched.role_ids && errors.role_ids) as string}
    />
  );
};

export const UserToRoleUpdate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [updateUserToRoles] = useUpdateUserToRolesMutation();
  const { userId: userIdP } = useParams();
  const userId = Number(userIdP);
  const { userToRoles } = useListUserToRoleQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        userToRoles: data
          ? data.find((u) => u.node_id === currentNode.id && u.user_id === userId) ?? {
              user_id: userId,
              node_id: currentNode.id,
              role_ids: [],
            }
          : undefined,
      }),
    }
  );

  if (!userToRoles) {
    return <Loading />;
  }

  return (
    <CreateLayout
      title={t("userToRole.create", { node: currentNode.name })}
      initialValues={userToRoles}
      validationSchema={UpdateUserToRolesSchema}
      submitLabel={t("add")}
      successRoute={UserToRoleRoutes.list()}
      onSubmit={(u) =>
        updateUserToRoles({ nodeId: currentNode.id, newUserToRoles: { user_id: userId, role_ids: u.role_ids } })
      }
      form={UserToRoleUpdateForm}
    />
  );
});
