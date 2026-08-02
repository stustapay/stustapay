import { Loading } from "@stustapay/components";
import { UpdateTseSchema } from "@stustapay/models";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

import { TseRoutes } from "@/app/routes";
import { EditLayoutV2 } from "@/components";
import { getTseCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { UpdateTseForm } from "./UpdateTseForm";

export const TseUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { tseId } = useParams();
  const { currentNode } = useCurrentNode();
  const {
    data: tse,
    isLoading,
    isError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ tses: getTseCollection(currentNode.id) })
        .where(({ tses }) => eq(tses.id, Number(tseId)))
        .findOne(),
    [currentNode.id, tseId]
  );

  if (isLoading || !tse) {
    return <Loading />;
  }

  if (isError) {
    return <Navigate to={TseRoutes.list()} />;
  }

  return (
    <EditLayoutV2
      title={t("tse.update")}
      successRoute={TseRoutes.detail(tse.id)}
      initialValues={tse}
      validationSchema={UpdateTseSchema}
      onSubmit={(updatedTse) =>
        getTseCollection(currentNode.id).update(tse.id, (draft) => {
          draft.name = updatedTse.name;
          draft.ws_url = updatedTse.ws_url;
          draft.ws_timeout = updatedTse.ws_timeout;
          draft.password = updatedTse.password;
          draft.first_operation = updatedTse.first_operation;
        })
      }
      form={UpdateTseForm}
    />
  );
};
