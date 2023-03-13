import { useCreateTillButtonMutation } from "@api";
import { NewTillButton, NewTillButtonSchema } from "@models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { TillButtonChange } from "./TillButtonChange";

const initialValues: NewTillButton = {
  name: "",
  product_ids: [],
};

export const TillButtonCreate: React.FC = () => {
  const { t } = useTranslation(["tills", "common"]);
  const [createTillButton] = useCreateTillButtonMutation();

  return (
    <TillButtonChange
      headerTitle={t("button.create")}
      submitLabel={t("add", { ns: "common" })}
      initialValues={initialValues}
      validationSchema={NewTillButtonSchema}
      onSubmit={createTillButton}
    />
  );
};
