import * as React from "react";
import { NewTillRegister, NewTillRegisterSchema } from "@stustapay/models";
import { useTranslation } from "react-i18next";
import { TillRegisterChange } from "./TillRegisterChange";
import { useCreateRegisterMutation } from "@api";

const initialValues: NewTillRegister = {
  name: "",
};

export const TillRegisterCreate: React.FC = () => {
  const { t } = useTranslation();
  const [createRegister] = useCreateRegisterMutation();

  return (
    <TillRegisterChange
      headerTitle={t("register.createRegister")}
      submitLabel={t("add")}
      initialValues={initialValues}
      validationSchema={NewTillRegisterSchema}
      onSubmit={(register) => createRegister({ newCashRegister: register })}
    />
  );
};
