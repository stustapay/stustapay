import { NewTse, useCreateTseMutation } from "@/api";
import { TseRoutes } from "@/app/routes";
import { CreateLayout } from "@components";
import { NewTseSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { TseForm } from "./TseForm";

const initialValues: NewTse = {
  name: "",
  type: "diebold_nixdorf",
  serial: "",
  ws_url: "",
  ws_timeout: 5,
  password: "",
};

export const TseCreate: React.FC = () => {
  const { t } = useTranslation();
  const [createTse] = useCreateTseMutation();

  return (
    <CreateLayout
      title={t("tse.create")}
      submitLabel={t("add")}
      successRoute={TseRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewTseSchema}
      onSubmit={(tse) => createTse({ newTse: tse })}
      form={TseForm}
    />
  );
};
