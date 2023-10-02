import { selectTseById, useListTsesQuery } from "@/api";
import { TseRoutes } from "@/app/routes";
import { DetailLayout } from "@/components";
import { useCurrentNode } from "@hooks";
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
      actions={[
        {
          label: t("edit"),
          onClick: () => navigate(TseRoutes.edit(tseId)),
          color: "primary",
          icon: <EditIcon />,
        },
      ]}
    >
      <Paper>
        <List>
          <ListItem>
            <ListItemText primary={t("tse.name")} secondary={tse.name} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("tse.type")} secondary={tse.type} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("tse.status")} secondary={tse.status} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("tse.serial")} secondary={tse.serial} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("tse.wsUrl")} secondary={tse.ws_url} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("tse.wsTimeout")} secondary={tse.ws_timeout} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("tse.hashalgo")} secondary={tse.hashalgo} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("tse.timeFormat")} secondary={tse.time_format} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("tse.publicKey")} secondary={tse.public_key} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("tse.certificate")} secondary={tse.certificate} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("tse.processDataEncoding")} secondary={tse.process_data_encoding} />
          </ListItem>
        </List>
      </Paper>
    </DetailLayout>
  );
};
