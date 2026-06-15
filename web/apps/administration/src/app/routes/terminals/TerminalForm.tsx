import { NewTerminal, selectEntryAreaAll, useListEntryAreasQuery } from "@/api";
import { useCurrentNode } from "@/hooks";
import { FormCheckbox, FormSelect, FormTextField } from "@stustapay/form-components";
import { Select } from "@stustapay/components";
import { FormControl, InputLabel, MenuItem, Select as MuiSelect } from "@mui/material";
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
    if (values.mode !== "till" && values.self_service) {
      setFieldValue("self_service", false);
    }
    if (values.mode !== "till" || !values.self_service) {
      setFieldValue("app_display_mode", null);
    }
  }, [values.mode, values.entry_area_id, values.self_service, setFieldValue]);

  const showDisplayMode = values.mode === "till" && values.self_service;

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
      <FormCheckbox
        name="self_service"
        label={t("terminal.selfService")}
        formik={props}
        disabled={values.mode !== "till"}
      />
      {showDisplayMode && (
        <FormControl fullWidth>
          <InputLabel id="terminal-app-display-mode-label">{t("terminal.appDisplayMode.label")}</InputLabel>
          <MuiSelect
            labelId="terminal-app-display-mode-label"
            label={t("terminal.appDisplayMode.label")}
            value={values.app_display_mode ?? ""}
            onChange={(event) => {
              const nextValue = event.target.value as "" | "day" | "night";
              setFieldValue("app_display_mode", nextValue === "" ? null : nextValue);
            }}
          >
            <MenuItem value="">{t("terminal.appDisplayMode.localDefault")}</MenuItem>
            <MenuItem value="day">{t("terminal.appDisplayMode.day")}</MenuItem>
            <MenuItem value="night">{t("terminal.appDisplayMode.night")}</MenuItem>
          </MuiSelect>
        </FormControl>
      )}
    </>
  );
}
