import { useCreateEntryGroupMutation } from "@/api";
import { EntryGroupRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { NewEntryGroup, NewEntryGroupSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { EntryGroupForm } from "./EntryGroupForm";

const initialValues: NewEntryGroup = {
  name: "",
  description: "",
};

export const EntryGroupCreate: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [createEntryGroup] = useCreateEntryGroupMutation();

  return (
    <CreateLayout
      title={t("entry.groupCreate")}
      submitLabel={t("add")}
      successRoute={EntryGroupRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewEntryGroupSchema}
      onSubmit={(group) => createEntryGroup({ nodeId: currentNode.id, newEntryGroup: group })}
      form={EntryGroupForm}
    />
  );
};
