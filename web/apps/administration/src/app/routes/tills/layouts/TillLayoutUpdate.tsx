import { useGetTillLayoutQuery, useUpdateTillLayoutMutation } from "@api";
import * as React from "react";
import { TillLayoutSchema } from "@stustapay/models";
import { Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TillLayoutChange } from "./TillLayoutChange";
import { Loading } from "@stustapay/components";
import { TillLayoutRoutes } from "@/app/routes";
import { useCurrentNode } from "@hooks";

export const TillLayoutUpdate: React.FC = () => {
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
};
