import { NewTerminal, NewTerminalSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { withPrivilegeGuard } from "@/app/layout";
import { TerminalRoutes } from "@/app/routes";
import { CreateLayoutV2 } from "@/components";
import { Terminal } from "@/db/api/generated";
import { generateId, getTerminalCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { TerminalForm } from "./TerminalForm";

const initialValues: NewTerminal = {
  name: "",
  description: "",
};

export const TerminalCreate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  return (
    <CreateLayoutV2
      title={t("terminal.create")}
      successRoute={(terminal: Terminal) => TerminalRoutes.detail(terminal.id)}
      initialValues={initialValues}
      validationSchema={NewTerminalSchema}
      onSubmit={(terminal) =>
        getTerminalCollection(currentNode.id).insert({
          ...terminal,
          id: generateId(),
          node_id: currentNode.id,
          till_id: null,
          session_uuid: null,
          registration_uuid: null,
          last_seen: new Date().toISOString(),
        })
      }
      form={TerminalForm}
    />
  );
});
