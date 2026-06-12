import { FormCheckbox } from "@stustapay/form-components";
import { EventPrivilegeSchema, NodePrivilegeSchema } from "@stustapay/models";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { EventPrivilegeSelect, NodePrivilegeSelect } from "@/components/features";

export const UserRoleUpdateSchema = z.object({
  id: z.number(),
  is_privileged: z.boolean(),
  event_privileges: z.array(EventPrivilegeSchema),
  node_privileges: z.array(NodePrivilegeSchema),
});

export type UserRoleUpdate = z.infer<typeof UserRoleUpdateSchema>;

export type UserRoleUpdateFormProps<T extends UserRoleUpdate> = FormikProps<T>;

export function UserRoleUpdateForm<T extends UserRoleUpdate>(props: UserRoleUpdateFormProps<T>) {
  const { t } = useTranslation();
  const { values, touched, errors, setFieldValue } = props;
  return (
    <>
      <FormCheckbox name="is_privileged" label={t("userRole.isPrivileged")} formik={props} />

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
