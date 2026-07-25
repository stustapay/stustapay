import { Loading } from "@stustapay/components";
import { UpdateTillSchema } from "@stustapay/models";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

import { withPrivilegeGuard } from "@/app/layout";
import { TillRoutes } from "@/app/routes";
import { EditLayoutV2 } from "@/components";
import { getTillCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { TillForm } from "./TillForm";

export const TillUpdate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { tillId } = useParams();
  const { currentNode } = useCurrentNode();
  const {
    data: till,
    isLoading,
    isError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ tills: getTillCollection(currentNode.id) })
        .where(({ tills }) => eq(tills.id, Number(tillId)))
        .findOne(),
    [currentNode.id, tillId]
  );

  if (isError) {
    return <Navigate to={TillRoutes.action("list")} />;
  }

  if (isLoading || !till) {
    return <Loading />;
  }

  return (
    <EditLayoutV2
      title={t("till.update")}
      successRoute={TillRoutes.detail(till.id)}
      initialValues={till}
      form={TillForm}
      validationSchema={UpdateTillSchema}
      onSubmit={(updatedTill) =>
        getTillCollection(currentNode.id).update(till.id, (draft) => {
          draft.name = updatedTill.name;
          draft.description = updatedTill.description;
          draft.active_profile_id = updatedTill.active_profile_id;
          draft.terminal_id = updatedTill.terminal_id;
          draft.active_shift = updatedTill.active_shift;
        })
      }
    />
  );
});
