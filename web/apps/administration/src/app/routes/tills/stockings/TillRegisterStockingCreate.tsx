import { TillStockingsRoutes } from "@/app/routes";
import { useCreateRegisterStockingMutation } from "@api";
import { CreateLayout } from "@components";
import { NewTillRegisterStocking, NewTillRegisterStockingSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { TillRegisterStockingForm } from "./TillRegisterStockingForm";

const initialValues: NewTillRegisterStocking = {
  name: "",
  euro200: 0,
  euro100: 0,
  euro50: 0,
  euro20: 0,
  euro10: 0,
  euro5: 0,
  euro2: 0,
  euro1: 0,
  cent50: 0,
  cent20: 0,
  cent10: 0,
  cent5: 0,
  cent2: 0,
  cent1: 0,
  variable_in_euro: 0,
};

export const TillRegisterStockingCreate: React.FC = () => {
  const { t } = useTranslation();
  const [createStocking] = useCreateRegisterStockingMutation();

  return (
    <CreateLayout
      title={t("register.createStocking")}
      submitLabel={t("add")}
      successRoute={TillStockingsRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewTillRegisterStockingSchema}
      onSubmit={(stocking) => createStocking({ newCashRegisterStocking: stocking })}
      form={TillRegisterStockingForm}
    />
  );
};
