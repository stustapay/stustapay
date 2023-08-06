import { TillRegistersRoutes } from "@/app/routes";
import { useCreateRegisterMutation } from "@api";
import { CreateLayout } from "@components";
import { NewTillRegister, NewTillRegisterSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { TillRegisterForm } from "./TillRegisterForm";

const initialValues: NewTillRegister = {
  name: "",
};

export const TillRegisterCreate: React.FC = () => {
  const { t } = useTranslation();
  const [createRegister] = useCreateRegisterMutation();

  return (
    <CreateLayout
      title={t("register.createRegister")}
      submitLabel={t("add")}
      successRoute={TillRegistersRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewTillRegisterSchema}
      onSubmit={(register) => createRegister({ newCashRegister: register })}
      form={TillRegisterForm}
    />
  );
};
