import { useGetTillLayoutQuery, useUpdateTillLayoutMutation } from "@/api";
import { TillLayoutRoutes } from "@/app/routes";
import { useCurrentNode } from "@/hooks";
import { Loading } from "@stustapay/components";
import { TillLayoutSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";
import { TillLayoutChange } from "./TillLayoutChange";
import { withPrivilegeGuard } from "@/app/layout";

export const TillLayoutUpdate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { layoutId } = useParams();
  const { currentNode } = useCurrentNode();
  const {
    data: layout,
    isLoading,
    error,
  } = useGetTillLayoutQuery({ nodeId: currentNode.id, layoutId: Number(layoutId) });
  const [updateLayout] = useUpdateTillLayoutMutation();

  if (error) {
    return <Navigate to={TillLayoutRoutes.list()} />;
  }

  if (isLoading || !layout) {
    return <Loading />;
  }

  return (
    <TillLayoutChange
      headerTitle={t("layout.update")}
      submitLabel={t("update")}
      initialValues={layout}
      validationSchema={TillLayoutSchema}
      onSubmit={(layout) => updateLayout({ nodeId: currentNode.id, layoutId: layout.id, newTillLayout: layout })}
    />
  );
});
