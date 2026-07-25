import { ListItem } from "@mui/material";
import { Loading } from "@stustapay/components";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

import { AuditLogRoutes } from "@/app/routes";
import { DetailField, DetailLayout, DetailView, UserDetailField } from "@/components";
import { getAuditLogCollection, getUserCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

export const AuditLogDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { auditLogId } = useParams();

  const {
    data: auditLog,
    isLoading,
    isError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ auditLogs: getAuditLogCollection(currentNode.id) })
        .where(({ auditLogs }) => eq(auditLogs.id, Number(auditLogId)))
        .join({ users: getUserCollection(currentNode.id) }, ({ auditLogs, users }) =>
          eq(auditLogs.originating_user_id, users.id),
        )
        .select(({ auditLogs, users }) => ({
          ...auditLogs,
          originatingUser: users,
        }))
        .findOne(),
    [currentNode.id, auditLogId],
  );

  if (isError) {
    return <Navigate to={AuditLogRoutes.list()} />;
  }

  if (isLoading || !auditLog) {
    return <Loading />;
  }

  const originatingUser = auditLog.originatingUser;

  return (
    <DetailLayout title={t("auditLog.auditLogs")}>
      <DetailView>
        <DetailField label={t("common.id")} value={auditLog.id} />
        <DetailField label={t("auditLog.logType")} value={auditLog.log_type} />
        <DetailField label={t("common.createdAt")} value={auditLog.created_at} />
        <UserDetailField
          label={t("auditLog.originatingUser")}
          user={originatingUser}
          fallbackNodeId={auditLog.node_id}
        />

        {Object.keys(auditLog.content).length > 0 && (
          <ListItem>
            <pre>{JSON.stringify(auditLog.content, null, 2)}</pre>
          </ListItem>
        )}
      </DetailView>
    </DetailLayout>
  );
};
