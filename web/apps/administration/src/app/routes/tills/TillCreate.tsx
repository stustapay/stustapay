import * as React from "react";
import { NewTill, NewTillSchema } from "@models";
import { useCreateTillMutation } from "@api";
import { useTranslation } from "react-i18next";
import { TillChange } from "./TillChange";

const initialValues: NewTill = {
  name: "",
  description: "",
  tse_id: undefined,
  active_cashier_id: undefined,
  active_profile_id: undefined as unknown as number, // to circument typescript
  active_shift: undefined,
};

export const TillCreate: React.FC = () => {
  const { t } = useTranslation(["tills", "common"]);
  const [createTill] = useCreateTillMutation();

  return (
    <TillChange
      headerTitle={t("till.create")}
      submitLabel={t("add", { ns: "common" })}
      initialValues={initialValues}
      validationSchema={NewTillSchema}
      onSubmit={createTill}
    />
  );
};
