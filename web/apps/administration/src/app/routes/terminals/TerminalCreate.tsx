import * as React from "react";
import { NewTerminal, NewTerminalSchema } from "@models";
import { useCreateTerminalMutation } from "@api";
import { useTranslation } from "react-i18next";
import { TerminalChange } from "./TerminalChange";

const initialValues: NewTerminal = {
  name: "",
  description: "",
  tseid: null,
  active_cashier: null,
  active_profile: null,
  active_shift: null,
};

export const TerminalCreate: React.FC = () => {
  const { t } = useTranslation(["terminals", "common"]);
  const [createTerminal] = useCreateTerminalMutation();

  return (
    <TerminalChange
      headerTitle={t("createTerminal")}
      submitLabel={t("add", { ns: "common" })}
      initialValues={initialValues}
      validationSchema={NewTerminalSchema}
      onSubmit={createTerminal}
    />
  );
};
