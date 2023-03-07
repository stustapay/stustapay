import { useUpdateTerminalButtonMutation, useGetTerminalButtonByIdQuery } from "@api";
import * as React from "react";
import { useParams, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loading } from "@components/Loading";
import { TerminalButtonChange } from "./TerminalButtonChange";
import { UpdateTerminalButtonSchema } from "@models";

export const TerminalButtonUpdate: React.FC = () => {
  const { t } = useTranslation(["terminals", "common"]);
  const { buttonId } = useParams();
  const { data: button, isLoading } = useGetTerminalButtonByIdQuery(Number(buttonId));
  const [updateButton] = useUpdateTerminalButtonMutation();

  if (isLoading) {
    return <Loading />;
  }

  if (!button) {
    return <Navigate to="/terminal-buttons" />;
  }

  return (
    <TerminalButtonChange
      headerTitle={t("button.update")}
      submitLabel={t("update", { ns: "common" })}
      initialValues={button}
      validationSchema={UpdateTerminalButtonSchema}
      onSubmit={updateButton}
    />
  );
};
