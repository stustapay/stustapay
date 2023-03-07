import * as React from "react";
import { NewTerminalProfile, NewTerminalProfileSchema } from "@models";
import { useCreateTerminalProfileMutation } from "@api";
import { useTranslation } from "react-i18next";
import { TerminalProfileChange } from "./TerminalProfileChange";

const initialValues: NewTerminalProfile = {
  name: "",
  description: "",
  layout_id: undefined as unknown as number, // TODO
};

export const TerminalProfileCreate: React.FC = () => {
  const { t } = useTranslation(["terminals", "common"]);
  const [createLayout] = useCreateTerminalProfileMutation();

  return (
    <TerminalProfileChange
      headerTitle={t("profile.create")}
      submitLabel={t("add", { ns: "common" })}
      initialValues={initialValues}
      validationSchema={NewTerminalProfileSchema}
      onSubmit={createLayout}
    />
  );
};
