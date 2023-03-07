import { useUpdateTerminalLayoutMutation, useGetTerminalLayoutByIdQuery } from "@api";
import * as React from "react";
import { TerminalLayoutSchema } from "@models";
import { useParams, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TerminalLayoutChange } from "./TerminalLayoutChange";
import { Loading } from "@components/Loading";

export const TerminalLayoutUpdate: React.FC = () => {
  const { t } = useTranslation(["terminals", "common"]);
  const { layoutId } = useParams();
  const { data: layout, isLoading } = useGetTerminalLayoutByIdQuery(Number(layoutId));
  const [updateLayout] = useUpdateTerminalLayoutMutation();

  if (isLoading) {
    return <Loading />;
  }

  if (!layout) {
    return <Navigate to="/terminal-layouts" />;
  }

  return (
    <TerminalLayoutChange
      headerTitle={t("layout.update")}
      submitLabel={t("update", { ns: "common" })}
      initialValues={layout}
      validationSchema={TerminalLayoutSchema}
      onSubmit={updateLayout}
    />
  );
};
