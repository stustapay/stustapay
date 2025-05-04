import { NewTse, useCreateTseMutation } from "@/api";
import { TseRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
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
  first_operation: null,
};

export const TseCreate: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [createTse] = useCreateTseMutation();

  return (
    <CreateLayout
      title={t("tse.create")}
      submitLabel={t("add")}
      successRoute={TseRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewTseSchema}
      onSubmit={(tse) => createTse({ nodeId: currentNode.id, newTse: tse })}
      form={TseForm}
    />
  );
};
