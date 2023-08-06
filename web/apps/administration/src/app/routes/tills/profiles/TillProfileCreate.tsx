import { TillProfileRoutes } from "@/app/routes";
import { useCreateTillProfileMutation } from "@api";
import { CreateLayout } from "@components";
import { NewTillProfile, NewTillProfileSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { TillProfileForm } from "./TillProfileForm";

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
    <CreateLayout
      title={t("profile.create")}
      submitLabel={t("add")}
      successRoute={TillProfileRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewTillProfileSchema}
      onSubmit={(profile) => createProfile({ newTillProfile: profile })}
      form={TillProfileForm}
    />
  );
};
