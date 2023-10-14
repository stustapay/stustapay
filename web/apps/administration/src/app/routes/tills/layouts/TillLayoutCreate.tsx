import { useCreateTillLayoutMutation } from "@/api";
import { useCurrentNode } from "@/hooks";
import { NewTillLayout, NewTillLayoutSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { TillLayoutChange } from "./TillLayoutChange";

const initialValues: NewTillLayout = {
  name: "",
  description: "",
  button_ids: null,
  ticket_ids: null,
};

export const TillLayoutCreate: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [createLayout] = useCreateTillLayoutMutation();

  return (
    <TillLayoutChange
      headerTitle={t("layout.create")}
      submitLabel={t("add")}
      initialValues={initialValues}
      validationSchema={NewTillLayoutSchema}
      onSubmit={(layout) => createLayout({ nodeId: currentNode.id, newTillLayout: layout })}
    />
  );
};
