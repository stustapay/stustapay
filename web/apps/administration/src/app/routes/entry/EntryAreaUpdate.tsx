import { useGetEntryAreaQuery, useUpdateEntryAreaMutation } from "@/api";
import { EntryAreaRoutes } from "@/app/routes";
import { EditLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Loading } from "@stustapay/components";
import { NewEntryAreaSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";
import { EntryAreaForm } from "./EntryAreaForm";

export const EntryAreaUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { entryAreaId } = useParams();
  const { currentNode } = useCurrentNode();
  const { data: entryArea, isLoading, error } = useGetEntryAreaQuery({
    nodeId: currentNode.id,
    areaId: Number(entryAreaId),
  });
  const [updateEntryArea] = useUpdateEntryAreaMutation();

  if (error) {
    return <Navigate to={EntryAreaRoutes.list()} />;
  }

  if (isLoading || !entryArea) {
    return <Loading />;
  }

  return (
    <EditLayout
      title={t("entry.areaUpdate")}
      submitLabel={t("update")}
      successRoute={EntryAreaRoutes.detail(entryArea.id)}
      initialValues={entryArea}
      form={EntryAreaForm}
      validationSchema={NewEntryAreaSchema}
      onSubmit={(area) => updateEntryArea({ nodeId: currentNode.id, areaId: entryArea.id, newEntryArea: area })}
    />
  );
};
