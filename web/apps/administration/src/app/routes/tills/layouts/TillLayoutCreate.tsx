import { NewTillLayout, NewTillLayoutSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { withPrivilegeGuard } from "@/app/layout";
import { generateId, getTillLayoutCollection } from "@/db/collections";
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

  return (
    <TillLayoutChange
      headerTitle={t("layout.create")}
      submitLabel={t("add")}
      initialValues={initialValues}
      validationSchema={NewTillLayoutSchema}
      onSubmit={(layout) =>
        getTillLayoutCollection(currentNode.id).insert({
          ...layout,
          id: generateId(),
          node_id: currentNode.id,
        })
      }
    />
  );
});
