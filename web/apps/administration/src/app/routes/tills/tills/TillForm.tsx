import { NewTill, Terminal, selectTerminalAll, useListTerminalsQuery } from "@/api";
import { FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";
import { TillProfile, selectTillProfileAll, useListTillProfilesQuery } from "@/api";
import { useCurrentNode } from "@/hooks";
import { Select } from "@stustapay/components";

export type TillFormProps<T extends NewTill> = FormikProps<T>;

export function TillForm<T extends NewTill>(props: TillFormProps<T>) {
  const { currentNode } = useCurrentNode();
  const { touched, values, setFieldValue, errors } = props;
  const { t } = useTranslation();
  const { profiles } = useListTillProfilesQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        profiles: data ? selectTillProfileAll(data) : [],
      }),
    }
  );
  const { terminals } = useListTerminalsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        terminals: data ? selectTerminalAll(data).filter((t) => t.till_id == null) : [],
      }),
    }
  );
  return (
    <>
      <FormTextField autoFocus name="name" label={t("till.name")} formik={props} />
      <FormTextField name="description" label={t("till.description")} formik={props} />
      <Select
        multiple={false}
        formatOption={(profile: TillProfile) => profile.name}
        value={profiles.find((p) => p.id === values.active_profile_id) ?? null}
        options={profiles}
        label={t("till.profile")}
        error={touched.active_profile_id && !!errors.active_profile_id}
        helperText={(touched.active_profile_id && errors.active_profile_id) as string}
        onChange={(value: TillProfile | null) =>
          value != null ? setFieldValue("active_profile_id", value.id) : undefined
        }
      />
      <Select
        multiple={false}
        formatOption={(terminal: Terminal) => terminal.name}
        value={terminals.find((p) => p.id === values.terminal_id) ?? null}
        options={terminals}
        label={t("till.terminal")}
        error={touched.terminal_id && !!errors.terminal_id}
        helperText={(touched.terminal_id && errors.terminal_id) as string}
        onChange={(value: Terminal | null) => (value != null ? setFieldValue("terminal_id", value.id) : undefined)}
      />
    </>
  );
}
