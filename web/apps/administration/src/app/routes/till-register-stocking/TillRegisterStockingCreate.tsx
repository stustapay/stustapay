import * as React from "react";
import { NewTillRegisterStockingSchema, NewTillRegisterStocking } from "@stustapay/models";
import { useTranslation } from "react-i18next";
import { TillRegisterStockkingChange } from "./TillRegisterStockingChange";
import { useCreateTillRegisterStockingMutation } from "@api/tillRegisterStockingApi";

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
  const { t } = useTranslation(["tills", "common"]);
  const [createStocking] = useCreateTillRegisterStockingMutation();

  return (
    <TillRegisterStockkingChange
      headerTitle={t("register.createStocking")}
      submitLabel={t("add", { ns: "common" })}
      initialValues={initialValues}
      validationSchema={NewTillRegisterStockingSchema}
      onSubmit={createStocking}
    />
  );
};
