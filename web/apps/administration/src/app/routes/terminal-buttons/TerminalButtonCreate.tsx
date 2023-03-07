import { useCreateTerminalButtonMutation } from "@api";
import { NewTerminalButton, NewTerminalButtonSchema } from "@models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { TerminalButtonChange } from "./TerminalButtonChange";

const initialValues: NewTerminalButton = {
  name: "",
  product_ids: [],
};

export const TerminalButtonCreate: React.FC = () => {
  const { t } = useTranslation(["terminals", "common"]);
  const [createTerminalButton] = useCreateTerminalButtonMutation();

  return (
    <TerminalButtonChange
      headerTitle={t("button.create")}
      submitLabel={t("add", { ns: "common" })}
      initialValues={initialValues}
      validationSchema={NewTerminalButtonSchema}
      onSubmit={createTerminalButton}
    />
  );
};
