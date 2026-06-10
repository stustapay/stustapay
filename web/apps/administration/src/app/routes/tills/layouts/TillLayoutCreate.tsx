import { NewTillLayout, NewTillLayoutSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { useCreateTillLayoutMutation } from "@/api";
import { withPrivilegeGuard } from "@/app/layout";
import { useCurrentNode } from "@/hooks";

import { TillLayoutChange } from "./TillLayoutChange";

const initialValues: NewTillLayout = {
  name: "",
  description: "",
  button_ids: null,
  ticket_ids: null,
};

export const TillLayoutCreate: React.FC = withPrivilegeGuard("node_administration", () => {
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
});
