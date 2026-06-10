import { NewTerminal, NewTerminalSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { useCreateTerminalMutation } from "@/api";
import { withPrivilegeGuard } from "@/app/layout";
import { TerminalRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { useCurrentNode } from "@/hooks";

import { TerminalForm } from "./TerminalForm";

const initialValues: NewTerminal = {
  name: "",
  description: "",
};

export const TerminalCreate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [createTerminal] = useCreateTerminalMutation();

  return (
    <CreateLayout
      title={t("terminal.create")}
      successRoute={(terminal) => TerminalRoutes.detail(terminal.id)}
      initialValues={initialValues}
      validationSchema={NewTerminalSchema}
      onSubmit={(terminal) => createTerminal({ nodeId: currentNode.id, newTerminal: terminal })}
      form={TerminalForm}
    />
  );
});
