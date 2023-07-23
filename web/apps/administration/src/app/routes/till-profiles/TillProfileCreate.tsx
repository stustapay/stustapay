import * as React from "react";
import { NewTillProfile, NewTillProfileSchema } from "@stustapay/models";
import { useCreateTillProfileMutation } from "@api";
import { useTranslation } from "react-i18next";
import { TillProfileChange } from "./TillProfileChange";

const initialValues: NewTillProfile = {
  name: "",
  description: "",
  layout_id: undefined as unknown as number, // TODO
  allow_cash_out: false,
  allow_top_up: false,
  allow_ticket_sale: false,
  allowed_role_names: [],
};

export const TillProfileCreate: React.FC = () => {
  const { t } = useTranslation();
  const [createProfile] = useCreateTillProfileMutation();

  return (
    <TillProfileChange
      headerTitle={t("profile.create")}
      submitLabel={t("add")}
      initialValues={initialValues}
      validationSchema={NewTillProfileSchema}
      onSubmit={(profile) => createProfile({ newTillProfile: profile })}
    />
  );
};
