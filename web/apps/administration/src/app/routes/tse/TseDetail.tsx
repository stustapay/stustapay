import { selectTseById, useListTsesQuery } from "@/api";
import { TseRoutes } from "@/app/routes";
import { DetailField, DetailLayout, DetailView } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Edit as EditIcon } from "@mui/icons-material";
import { List, ListItem, ListItemText, Paper } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";

export const TseDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { tseId } = useParams();
  const navigate = useNavigate();
  const { tse, error } = useListTsesQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        tse: data ? selectTseById(data, Number(tseId)) : undefined,
      }),
    }
  );

  if (error) {
    return <Navigate to={TseRoutes.list()} />;
  }

  if (tse === undefined) {
    return <Loading />;
  }

  return (
    <DetailLayout
      title={tse.name}
      routes={TseRoutes}
      actions={[
        {
          label: t("edit"),
          onClick: () => navigate(TseRoutes.edit(tseId)),
          color: "primary",
          icon: <EditIcon />,
        },
      ]}
    >
      <DetailView>
        <DetailField label={t("tse.name")} value={tse.name} />
        <DetailField label={t("tse.type")} value={tse.type} />
        <DetailField label={t("tse.status")} value={tse.status} />
        <DetailField label={t("tse.serial")} value={tse.serial} />
        <DetailField label={t("tse.wsUrl")} value={tse.ws_url} />
        <DetailField label={t("tse.wsTimeout")} value={tse.ws_timeout} />
        <DetailField label={t("tse.hashalgo")} value={tse.hashalgo} />
        <DetailField label={t("tse.timeFormat")} value={tse.time_format} />
        <DetailField label={t("tse.publicKey")} value={tse.public_key} />
        <DetailField label={t("tse.certificate")} value={tse.certificate} />
        <DetailField label={t("tse.processDataEncoding")} value={tse.process_data_encoding} />
        <DetailField label={t("tse.certificateDate")} value={tse.certificate_date} />
        <DetailField label={t("common.description")} value={tse.tse_description} />
        <DetailField label={t("tse.firstOperation")} value={tse.first_operation} />
      </DetailView>
    </DetailLayout>
  );
};
