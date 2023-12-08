import { useGetTillQuery, useUpdateTillMutation } from "@/api";
import { TillRoutes } from "@/app/routes";
import { EditLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Loading } from "@stustapay/components";
import { UpdateTillSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";
import { TillForm } from "./TillForm";
import { withPrivilegeGuard } from "@/app/layout";

export const TillUpdate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { tillId } = useParams();
  const { currentNode } = useCurrentNode();
  const { data: till, isLoading, error } = useGetTillQuery({ nodeId: currentNode.id, tillId: Number(tillId) });
  const [updateTill] = useUpdateTillMutation();

  if (error) {
    return <Navigate to={TillRoutes.list()} />;
  }

  if (isLoading || !till) {
    return <Loading />;
  }

  return (
    <EditLayout
      title={t("till.update")}
      submitLabel={t("update")}
      successRoute={TillRoutes.detail(till.id)}
      initialValues={till}
      form={TillForm}
      validationSchema={UpdateTillSchema}
      onSubmit={(t) => updateTill({ nodeId: currentNode.id, tillId: till.id, newTill: t })}
    />
  );
});
