import { useGetEntryGroupQuery, useUpdateEntryGroupMutation } from "@/api";
import { EntryGroupRoutes } from "@/app/routes";
import { EditLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Loading } from "@stustapay/components";
import { NewEntryGroupSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";
import { EntryGroupForm } from "./EntryGroupForm";

export const EntryGroupUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { entryGroupId } = useParams();
  const { currentNode } = useCurrentNode();
  const { data: entryGroup, isLoading, error } = useGetEntryGroupQuery({
    nodeId: currentNode.id,
    groupId: Number(entryGroupId),
  });
  const [updateEntryGroup] = useUpdateEntryGroupMutation();

  if (error) {
    return <Navigate to={EntryGroupRoutes.list()} />;
  }

  if (isLoading || !entryGroup) {
    return <Loading />;
  }

  return (
    <EditLayout
      title={t("entry.groupUpdate")}
      submitLabel={t("update")}
      successRoute={EntryGroupRoutes.detail(entryGroup.id)}
      initialValues={entryGroup}
      form={EntryGroupForm}
      validationSchema={NewEntryGroupSchema}
      onSubmit={(group) => updateEntryGroup({ nodeId: currentNode.id, groupId: entryGroup.id, newEntryGroup: group })}
    />
  );
};
