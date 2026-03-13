import { useCreateEntryAreaMutation } from "@/api";
import { EntryAreaRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { NewEntryArea, NewEntryAreaSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { EntryAreaForm } from "./EntryAreaForm";

const initialValues: NewEntryArea = {
  name: "",
  description: "",
};

export const EntryAreaCreate: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [createEntryArea] = useCreateEntryAreaMutation();

  return (
    <CreateLayout
      title={t("entry.areaCreate")}
      submitLabel={t("add")}
      successRoute={EntryAreaRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewEntryAreaSchema}
      onSubmit={(area) => createEntryArea({ nodeId: currentNode.id, newEntryArea: area })}
      form={EntryAreaForm}
    />
  );
};
