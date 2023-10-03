import { selectTillButtonAll, useDeleteTillButtonMutation, useListTillButtonsQuery } from "@/api";
import { TillButtonsRoutes } from "@/app/routes";
import { ConfirmDialog, ConfirmDialogCloseHandler, ListLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { DataGrid, GridActionsCellItem, GridColDef } from "@mui/x-data-grid";
import { Loading } from "@stustapay/components";
import { TillButton } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export const TillButtonList: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const navigate = useNavigate();

  const { buttons, isLoading } = useListTillButtonsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        buttons: data ? selectTillButtonAll(data) : undefined,
      }),
    }
  );
  const [deleteButton] = useDeleteTillButtonMutation();

  const [buttonToDelete, setButtonToDelete] = React.useState<number | null>(null);
  if (isLoading) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = (buttonId: number) => {
    setButtonToDelete(buttonId);
  };

  const handleConfirmDeleteTaxRate: ConfirmDialogCloseHandler = (reason) => {
    if (reason === "confirm" && buttonToDelete !== null) {
      deleteButton({ nodeId: currentNode.id, buttonId: buttonToDelete })
        .unwrap()
        .catch(() => undefined);
    }
    setButtonToDelete(null);
  };

  const columns: GridColDef<TillButton>[] = [
    {
      field: "name",
      headerName: t("button.name") as string,
      flex: 1,
    },
    {
      field: "price",
      headerName: t("button.price") as string,
      type: "number",
      valueFormatter: ({ value }) => `${value} €`,
    },
    {
      field: "actions",
      type: "actions",
      headerName: t("actions") as string,
      width: 150,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          color="primary"
          label={t("edit")}
          onClick={() => navigate(TillButtonsRoutes.edit(params.row.id))}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          color="error"
          label={t("delete")}
          onClick={() => openConfirmDeleteDialog(params.row.id)}
        />,
      ],
    },
  ];

  return (
    <ListLayout title={t("button.buttons")} routes={TillButtonsRoutes}>
      <DataGrid
        autoHeight
        getRowId={(row) => row.name}
        rows={buttons ?? []}
        columns={columns}
        disableRowSelectionOnClick
        sx={{ p: 1, boxShadow: (theme) => theme.shadows[1] }}
      />
      <ConfirmDialog
        title={t("button.delete")}
        body={t("button.deleteDescription")}
        show={buttonToDelete !== null}
        onClose={handleConfirmDeleteTaxRate}
      />
    </ListLayout>
  );
};
