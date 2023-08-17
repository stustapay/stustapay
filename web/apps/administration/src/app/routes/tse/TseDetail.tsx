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
      title={tse.tse_name}
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
            <ListItemText primary={t("tse.name")} secondary={tse.tse_name} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("tse.status")} secondary={tse.tse_status} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("tse.serial")} secondary={tse.tse_serial} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("tse.hashalgo")} secondary={tse.tse_hashalgo} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("tse.timeFormat")} secondary={tse.tse_time_format} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("tse.publicKey")} secondary={tse.tse_public_key} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("tse.certificate")} secondary={tse.tse_certificate} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("tse.processDataEncoding")} secondary={tse.tse_process_data_encoding} />
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
