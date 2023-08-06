import { TillButtonsRoutes } from "@/app/routes";
import { useCreateTillButtonMutation } from "@api";
import { CreateLayout } from "@components";
import { NewTillButton, NewTillButtonSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { TillButtonForm } from "./TillButtonForm";

const initialValues: NewTillButton = {
  name: "",
  product_ids: [],
};

export const TillButtonCreate: React.FC = () => {
  const { t } = useTranslation();
  const [createTillButton] = useCreateTillButtonMutation();

  return (
    <CreateLayout
      title={t("button.create")}
      submitLabel={t("add")}
      successRoute={TillButtonsRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewTillButtonSchema}
      onSubmit={(button) => createTillButton({ newTillButton: button })}
      form={TillButtonForm}
    />
  );
};
