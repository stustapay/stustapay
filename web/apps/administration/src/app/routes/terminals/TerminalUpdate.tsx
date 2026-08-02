import { Loading } from "@stustapay/components";
import { UpdateTerminalSchema } from "@stustapay/models";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

import { withPrivilegeGuard } from "@/app/layout";
import { TerminalRoutes } from "@/app/routes";
import { EditLayoutV2 } from "@/components";
import { getTerminalCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { TerminalForm } from "./TerminalForm";

export const TerminalUpdate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { terminalId } = useParams();
  const { currentNode } = useCurrentNode();
  const {
    data: terminal,
    isLoading,
    isError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ terminals: getTerminalCollection(currentNode.id) })
        .where(({ terminals }) => eq(terminals.id, Number(terminalId)))
        .findOne(),
    [currentNode.id, terminalId]
  );

  if (isError) {
    return <Navigate to={TerminalRoutes.action("list")} />;
  }

  if (isLoading || !terminal) {
    return <Loading />;
  }

  return (
    <EditLayoutV2
      title={t("terminal.update")}
      successRoute={TerminalRoutes.detail(terminal.id)}
      initialValues={terminal}
      form={TerminalForm}
      validationSchema={UpdateTerminalSchema}
      onSubmit={(updatedTerminal) =>
        getTerminalCollection(currentNode.id).update(terminal.id, (draft) => {
          draft.name = updatedTerminal.name;
          draft.description = updatedTerminal.description;
        })
      }
    />
  );
});
