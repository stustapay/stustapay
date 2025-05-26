import { useCreateTerminalMutation } from "@/api";
import { TerminalRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { NewTerminal, NewTerminalSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { TerminalForm } from "./TerminalForm";
import { withPrivilegeGuard } from "@/app/layout";

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
      successRoute={TerminalRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewTerminalSchema}
      onSubmit={(terminal) => createTerminal({ nodeId: currentNode.id, newTerminal: terminal })}
      form={TerminalForm}
    />
  );
});
