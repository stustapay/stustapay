import * as React from "react";
import { NewTerminalLayout, NewTerminalLayoutSchema } from "@models";
import { useCreateTerminalLayoutMutation } from "@api";
import { useTranslation } from "react-i18next";
import { TerminalLayoutChange } from "./TerminalLayoutChange";

const initialValues: NewTerminalLayout = {
  name: "",
  description: "",
  button_ids: null,
  allow_top_up: false,
};

export const TerminalLayoutCreate: React.FC = () => {
  const { t } = useTranslation(["terminals", "common"]);
  const [createLayout] = useCreateTerminalLayoutMutation();

  return (
    <TerminalLayoutChange
      headerTitle={t("createTerminalLayout")}
      submitLabel={t("add", { ns: "common" })}
      initialValues={initialValues}
      validationSchema={NewTerminalLayoutSchema}
      onSubmit={createLayout}
    />
  );
};
