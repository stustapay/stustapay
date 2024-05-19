import { useGetTillButtonQuery, useUpdateTillButtonMutation } from "@/api";
import { TillButtonsRoutes } from "@/app/routes";
import { EditLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Loading } from "@stustapay/components";
import { UpdateTillButtonSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";
import { TillButtonForm } from "./TillButtonForm";
import { withPrivilegeGuard } from "@/app/layout";

export const TillButtonUpdate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { buttonId } = useParams();
  const {
    data: button,
    isLoading,
    error,
  } = useGetTillButtonQuery({ nodeId: currentNode.id, buttonId: Number(buttonId) });
  const [updateButton] = useUpdateTillButtonMutation();

  if (error) {
    return <Navigate to={TillButtonsRoutes.list()} />;
  }

  if (isLoading || !button) {
    return <Loading />;
  }

  return (
    <EditLayout
      title={t("button.update")}
      submitLabel={t("update")}
      successRoute={TillButtonsRoutes.list()}
      initialValues={button}
      validationSchema={UpdateTillButtonSchema}
      onSubmit={(b) => updateButton({ nodeId: currentNode.id, buttonId: button.id, newTillButton: b })}
      form={TillButtonForm}
    />
  );
});
