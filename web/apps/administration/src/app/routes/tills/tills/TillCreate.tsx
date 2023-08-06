import * as React from "react";
import { NewTill, NewTillSchema } from "@stustapay/models";
import { useCreateTillMutation } from "@api";
import { useTranslation } from "react-i18next";
import { TillChange } from "./TillChange";

const initialValues: NewTill = {
  name: "",
  description: "",
  active_user_id: undefined,
  active_profile_id: undefined as unknown as number, // to circument typescript
  active_shift: undefined,
};

export const TillCreate: React.FC = () => {
  const { t } = useTranslation();
  const [createTill] = useCreateTillMutation();

  return (
    <TillChange
      headerTitle={t("till.create")}
      submitLabel={t("add")}
      initialValues={initialValues}
      validationSchema={NewTillSchema}
      onSubmit={(till) => createTill({ newTill: till })}
    />
  );
};
