import { Select } from "@stustapay/components";
import { FormTextField } from "@stustapay/form-components";
import { useLiveQuery } from "@tanstack/react-db";
import { FormikProps } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { NewTill, Terminal, TillProfile } from "@/db/api/generated";
import { getTerminalCollection, getTillProfileCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

export type TillFormProps<T extends NewTill> = FormikProps<T>;

export function TillForm<T extends NewTill>(props: TillFormProps<T>) {
  const { currentNode } = useCurrentNode();
  const { touched, values, setFieldValue, errors } = props;
  const { t } = useTranslation();
  const { data: profiles } = useLiveQuery(
    (q) => q.from({ profiles: getTillProfileCollection(currentNode.id) }),
    [currentNode.id]
  );
  const { data: terminals } = useLiveQuery(
    (q) => q.from({ terminals: getTerminalCollection(currentNode.id) }),
    [currentNode.id]
  );
  const freeTerminals = terminals?.filter((terminal) => terminal.till_id == null) ?? [];

  return (
    <>
      <FormTextField autoFocus name="name" label={t("till.name")} formik={props} />
      <FormTextField name="description" label={t("till.description")} formik={props} />
      <Select
        multiple={false}
        formatOption={(profile: TillProfile) => profile.name}
        value={profiles?.find((profile) => profile.id === values.active_profile_id) ?? null}
        options={profiles ?? []}
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
        value={freeTerminals.find((terminal) => terminal.id === values.terminal_id) ?? null}
        options={freeTerminals}
        label={t("till.terminal")}
        error={touched.terminal_id && !!errors.terminal_id}
        helperText={(touched.terminal_id && errors.terminal_id) as string}
        onChange={(value: Terminal | null) => (value != null ? setFieldValue("terminal_id", value.id) : undefined)}
      />
    </>
  );
}
