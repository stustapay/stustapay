import { useGetTerminalQuery, useUpdateTerminalMutation } from "@/api";
import { TerminalRoutes } from "@/app/routes";
import { EditLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Loading } from "@stustapay/components";
import { UpdateTerminalSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";
import { TerminalForm } from "./TerminalForm";
import { withPrivilegeGuard } from "@/app/layout";

export const TerminalUpdate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { terminalId } = useParams();
  const { currentNode } = useCurrentNode();
  const {
    data: terminal,
    isLoading,
    error,
  } = useGetTerminalQuery({ nodeId: currentNode.id, terminalId: Number(terminalId) });
  const [updateTerminal] = useUpdateTerminalMutation();

  if (error) {
    return <Navigate to={TerminalRoutes.list()} />;
  }

  if (isLoading || !terminal) {
    return <Loading />;
  }

  return (
    <EditLayout
      title={t("terminal.update")}
      successRoute={TerminalRoutes.detail(terminal.id)}
      initialValues={terminal}
      form={TerminalForm}
      validationSchema={UpdateTerminalSchema}
      onSubmit={(t) => updateTerminal({ nodeId: currentNode.id, terminalId: terminal.id, newTerminal: t })}
    />
  );
});
