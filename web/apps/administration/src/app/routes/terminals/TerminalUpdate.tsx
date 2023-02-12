import { useUpdateTerminalMutation, useGetTerminalByIdQuery } from "@api";
import * as React from "react";
import { UpdateTerminalSchema } from "@models";
import { useParams, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TerminalChange } from "./TerminalChange";

export const TerminalUpdate: React.FC = () => {
  const { t } = useTranslation(["terminals", "common"]);
  const { terminalId } = useParams();
  const { data: terminal } = useGetTerminalByIdQuery(Number(terminalId));
  const [updateTerminal] = useUpdateTerminalMutation();

  if (!terminal) {
    return <Navigate to="/terminals" />;
  }

  return (
    <TerminalChange
      headerTitle={t("updateTerminal")}
      submitLabel={t("update", { ns: "common" })}
      initialValues={terminal}
      validationSchema={UpdateTerminalSchema}
      onSubmit={updateTerminal}
    />
  );
};
