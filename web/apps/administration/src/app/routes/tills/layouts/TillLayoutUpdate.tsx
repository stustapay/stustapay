import { Loading } from "@stustapay/components";
import { TillLayoutSchema } from "@stustapay/models";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

import { withPrivilegeGuard } from "@/app/layout";
import { TillLayoutRoutes } from "@/app/routes";
import { getTillLayoutCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { TillLayoutChange } from "./TillLayoutChange";

export const TillLayoutUpdate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { layoutId } = useParams();
  const { currentNode } = useCurrentNode();
  const {
    data: layout,
    isLoading,
    isError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ layouts: getTillLayoutCollection(currentNode.id) })
        .where(({ layouts }) => eq(layouts.id, Number(layoutId)))
        .findOne(),
    [currentNode.id, layoutId]
  );

  if (isError) {
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
      onSubmit={(updatedLayout) =>
        getTillLayoutCollection(currentNode.id).update(layout.id, (draft) => {
          draft.name = updatedLayout.name;
          draft.description = updatedLayout.description;
          draft.button_ids = updatedLayout.button_ids;
          draft.ticket_ids = updatedLayout.ticket_ids;
        })
      }
    />
  );
});
