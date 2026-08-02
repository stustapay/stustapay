import { Loading } from "@stustapay/components";
import { UpdateTillButtonSchema } from "@stustapay/models";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

import { withPrivilegeGuard } from "@/app/layout";
import { TillButtonsRoutes } from "@/app/routes";
import { EditLayoutV2 } from "@/components";
import { getTillButtonCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { TillButtonForm } from "./TillButtonForm";

export const TillButtonUpdate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { buttonId } = useParams();
  const {
    data: button,
    isLoading,
    isError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ buttons: getTillButtonCollection(currentNode.id) })
        .where(({ buttons }) => eq(buttons.id, Number(buttonId)))
        .findOne(),
    [currentNode.id, buttonId]
  );

  if (isError) {
    return <Navigate to={TillButtonsRoutes.list()} />;
  }

  if (isLoading || !button) {
    return <Loading />;
  }

  return (
    <EditLayoutV2
      title={t("button.update")}
      successRoute={TillButtonsRoutes.list()}
      initialValues={button}
      validationSchema={UpdateTillButtonSchema}
      onSubmit={(b) =>
        getTillButtonCollection(currentNode.id).update(button.id, (draft) => {
          draft.name = b.name;
          draft.product_ids = b.product_ids;
        })
      }
      form={TillButtonForm}
    />
  );
});
