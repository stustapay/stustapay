import { ListItem } from "@mui/material";
import { Loading } from "@stustapay/components";
import { getUserName } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { selectUserById, useGetAuditLogQuery, useListUsersQuery } from "@/api";
import { UserRoutes } from "@/app/routes";
import { DetailField, DetailLayout, DetailView } from "@/components";
import { useCurrentNode } from "@/hooks";

export const AuditLogDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { auditLogId } = useParams();

  const { data: auditLog } = useGetAuditLogQuery({
    nodeId: currentNode.id,
    auditLogId: Number(auditLogId),
  });
  const { data: users } = useListUsersQuery({ nodeId: currentNode.id });

  if (!auditLog || !users) {
    return <Loading />;
  }
  const renderUser = (id: number | null) => {
    if (!id || !users) {
      return "";
    }

    const user = selectUserById(users, id);
    if (!user) {
      return "";
    }

    return getUserName(user);
  };

  return (
    <DetailLayout title={t("auditLog.auditLogs")}>
      <DetailView>
        <DetailField label={t("common.id")} value={auditLog.id} />
        <DetailField label={t("auditLog.logType")} value={auditLog.log_type} />
        <DetailField label={t("common.createdAt")} value={auditLog.created_at} />
        <DetailField
          label={t("auditLog.originatingUser")}
          linkTo={UserRoutes.detail(auditLog.originating_user_id)}
          value={renderUser(auditLog.originating_user_id)}
        />

        {auditLog.content && (
          <ListItem>
            <pre>{JSON.stringify(auditLog.content, null, 2)}</pre>
          </ListItem>
        )}
      </DetailView>
    </DetailLayout>
  );
};
