import * as React from "react";
import { NewTillLayout, NewTillLayoutSchema } from "@models";
import { useCreateTillLayoutMutation } from "@api";
import { useTranslation } from "react-i18next";
import { TillLayoutChange } from "./TillLayoutChange";

const initialValues: NewTillLayout = {
  name: "",
  description: "",
  button_ids: null,
};

export const TillLayoutCreate: React.FC = () => {
  const { t } = useTranslation(["tills", "common"]);
  const [createLayout] = useCreateTillLayoutMutation();

  return (
    <TillLayoutChange
      headerTitle={t("layout.create")}
      submitLabel={t("add", { ns: "common" })}
      initialValues={initialValues}
      validationSchema={NewTillLayoutSchema}
      onSubmit={createLayout}
    />
  );
};
