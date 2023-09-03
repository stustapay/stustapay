import { selectTseById, useListTsesQuery } from "@/api";
import { TseRoutes } from "@/app/routes";
import { DetailLayout } from "@/components";
import { Edit as EditIcon } from "@mui/icons-material";
import { List, ListItem, ListItemText, Paper } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";

export const TseDetail: React.FC = () => {
  const { t } = useTranslation();
  const { tseId } = useParams();
  const navigate = useNavigate();
  //   const [deleteTse] = useDeleteTseMutation();
  const { tse, error } = useListTsesQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      tse: data ? selectTseById(data, Number(tseId)) : undefined,
    }),
  });
  //   const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);

  if (error) {
    return <Navigate to={TseRoutes.list()} />;
  }

  //   const openConfirmDeleteDialog = () => {
  //     setShowConfirmDelete(true);
  //   };

  //   const handleConfirmDeleteTse: ConfirmDialogCloseHandler = (reason) => {
  //     if (reason === "confirm") {
  //       deleteTse({ tseId: Number(tseId) }).then(() => navigate(TseRoutes.list()));
  //     }
  //     setShowConfirmDelete(false);
  //   };

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
        // { label: t("delete"), onClick: openConfirmDeleteDialog, color: "error", icon: <DeleteIcon /> },
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
      {/* <ConfirmDialog
        title={t("tse.delete")}
        body={t("tse.deleteDescription")}
        show={showConfirmDelete}
        onClose={handleConfirmDeleteTse}
      /> */}
    </DetailLayout>
  );
};
