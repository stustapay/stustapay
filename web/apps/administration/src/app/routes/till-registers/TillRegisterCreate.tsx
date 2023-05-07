import * as React from "react";
import { NewTillRegisterSchema, NewTillRegister } from "@stustapay/models";
import { useTranslation } from "react-i18next";
import { TillRegisterChange } from "./TillRegisterChange";
import { useCreateTillRegisterMutation } from "@api/tillRegisterApi";

const initialValues: NewTillRegister = {
  name: "",
};

export const TillRegisterCreate: React.FC = () => {
  const { t } = useTranslation(["tills", "common"]);
  const [createRegister] = useCreateTillRegisterMutation();

  return (
    <TillRegisterChange
      headerTitle={t("register.createRegister")}
      submitLabel={t("add", { ns: "common" })}
      initialValues={initialValues}
      validationSchema={NewTillRegisterSchema}
      onSubmit={createRegister}
    />
  );
};