import { FormGroup, FormHelperText } from "@mui/material";
import { FormCheckbox, FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";

import { NewUserRole } from "@/api";
import { EventPrivilegeSelect, NodePrivilegeSelect, RoleSelect } from "@/components/features";

export type UserRoleFormProps<T extends NewUserRole> = FormikProps<T>;

export function UserRoleForm<T extends NewUserRole>(props: UserRoleFormProps<T>) {
  const { t } = useTranslation();
  const { values, setFieldValue, touched, errors } = props;
  return (
    <>
      <FormTextField autoFocus name="name" label={t("userRole.name")} formik={props} />
      <FormGroup>
        <FormCheckbox
          label={t("userRole.canAssignAllRoles")}
          name="can_assign_all_roles"
          formik={props}
          onChange={(_event, checked) => {
            if (checked) {
              setFieldValue("assignable_role_ids", []);
            }
          }}
        />
        <FormHelperText>{t("userRole.canAssignAllRolesDescription")}</FormHelperText>
      </FormGroup>

      <RoleSelect
        label={t("userRole.assignableRoles")}
        value={values.assignable_role_ids ?? []}
        onChange={(roleIds) => setFieldValue("assignable_role_ids", roleIds)}
        disabled={values.can_assign_all_roles}
        error={touched.assignable_role_ids && !!errors.assignable_role_ids}
        helperText={(touched.assignable_role_ids && errors.assignable_role_ids) as string}
      />

      <EventPrivilegeSelect
        label={t("userRole.eventPrivileges")}
        value={values.event_privileges}
        onChange={(val) => setFieldValue("event_privileges", val)}
        error={touched.event_privileges && !!errors.event_privileges}
        helperText={(touched.event_privileges && errors.event_privileges) as string}
      />
      <NodePrivilegeSelect
        label={t("userRole.nodePrivileges")}
        value={values.node_privileges}
        onChange={(val) => setFieldValue("node_privileges", val)}
        error={touched.node_privileges && !!errors.node_privileges}
        helperText={(touched.node_privileges && errors.node_privileges) as string}
      />
    </>
  );
}
