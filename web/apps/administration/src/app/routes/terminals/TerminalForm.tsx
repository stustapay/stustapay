import { NewTerminal, selectEntryAreaAll, useListEntryAreasQuery } from "@/api";
import { useCurrentNode } from "@/hooks";
import { FormSelect, FormTextField } from "@stustapay/form-components";
import { Select } from "@stustapay/components";
import { FormikProps } from "formik";
import { useTranslation } from "react-i18next";
import * as React from "react";

export type TerminalFormProps<T extends NewTerminal> = FormikProps<T>;

export function TerminalForm<T extends NewTerminal>(props: TerminalFormProps<T>) {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { values, setFieldValue } = props;
  const { entryAreas } = useListEntryAreasQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        entryAreas: data ? selectEntryAreaAll(data) : [],
      }),
    }
  );

  React.useEffect(() => {
    if (values.mode === "till" && values.entry_area_id != null) {
      setFieldValue("entry_area_id", null);
    }
  }, [values.mode, values.entry_area_id, setFieldValue]);

  return (
    <>
      <FormTextField autoFocus name="name" label={t("common.name")} formik={props} />
      <FormTextField name="description" label={t("common.description")} formik={props} />
      <FormSelect
        name="mode"
        formik={props}
        multiple={false}
        formatOption={(mode: string) => t(`terminal.mode.${mode}`)}
        options={["till", "entry", "exit"]}
        label={t("terminal.mode.label")}
      />
      <Select
        multiple={false}
        formatOption={(area) => area.name}
        value={entryAreas.find((area) => area.id === values.entry_area_id) ?? null}
        options={entryAreas}
        label={t("entry.area")}
        disabled={values.mode === "till"}
        onChange={(area) => setFieldValue("entry_area_id", area?.id ?? null)}
      />
    </>
  );
}
