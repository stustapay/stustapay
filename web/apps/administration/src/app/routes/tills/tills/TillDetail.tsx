import {
  selectOrderAll,
  selectTerminalById,
  selectTillProfileById,
  useDeleteTillMutation,
  useGetTillQuery,
  useListOrdersByTillQuery,
  useListTerminalsQuery,
  useListTillProfilesQuery,
  useRemoveFromTerminalMutation,
} from "@/api";
import { TerminalRoutes, TillProfileRoutes, TillRoutes, TseRoutes } from "@/app/routes";
import { DetailField, DetailLayout, DetailNumberField, DetailView } from "@/components";
import { OrderTable, TillSwitchTerminal } from "@/components/features";
import { useCurrentNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon, Smartphone as SmartphoneIcon } from "@mui/icons-material";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

export const TillDetail: React.FC = () => {
  const { t } = useTranslation();
  const { tillId } = useParams();
  const { currentNode } = useCurrentNode();
  const navigate = useNavigate();
  const openModal = useOpenModal();

  const [deleteTill] = useDeleteTillMutation();
  const [removeFromTerminal] = useRemoveFromTerminalMutation();
  const { data: till, error: tillError } = useGetTillQuery({ nodeId: currentNode.id, tillId: Number(tillId) });
  const { orders, error: orderError } = useListOrdersByTillQuery(
    { nodeId: currentNode.id, tillId: Number(tillId) },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        orders: data ? selectOrderAll(data) : undefined,
      }),
    }
  );
  const { data: profiles, error: profileError } = useListTillProfilesQuery({ nodeId: currentNode.id });
  const { data: terminals, error: terminalError } = useListTerminalsQuery({ nodeId: currentNode.id });
  const [switchTerminalOpen, setSwitchTerminalOpen] = React.useState(false);

  if (tillError || orderError || profileError || terminalError) {
    toast.error("Error loading tills or orders");
    return <Navigate to={TillRoutes.list()} />;
  }

  const openConfirmDeleteDialog = () => {
    openModal({
      type: "confirm",
      title: t("till.delete"),
      content: t("till.deleteDescription"),
      onConfirm: () => {
        deleteTill({ nodeId: currentNode.id, tillId: Number(tillId) }).then(() => navigate(TillRoutes.list()));
      },
    });
  };

  if (till === undefined || terminals === undefined) {
    return <Loading />;
  }

  const renderProfile = (id: number) => {
    if (!profiles) {
      return "";
    }

    const profile = selectTillProfileById(profiles, id);
    if (!profile) {
      return "";
    }

    return profile.name;
  };

  const terminal = till.terminal_id != null ? selectTerminalById(terminals, till.terminal_id) : undefined;

  const openConfirmRemoveFromTerminalDialog = () => {
    if (!terminal) {
      return;
    }
    openModal({
      type: "confirm",
      title: t("till.removeFromTerminal"),
      content: t("till.removeFromTerminalDescription", { terminalName: terminal.name }),
      onConfirm: () => {
        removeFromTerminal({ nodeId: currentNode.id, tillId: Number(tillId) });
      },
    });
  };

  return (
    <DetailLayout
      title={till.name}
      routes={TillRoutes}
      elementNodeId={till.node_id}
      actions={[
        { label: t("edit"), onClick: () => navigate(TillRoutes.edit(tillId)), color: "primary", icon: <EditIcon /> },
        {
          label: t("till.switchTerminal"),
          onClick: () => setSwitchTerminalOpen(true),
          color: "warning",
          icon: <SmartphoneIcon />,
        },
        ...(till.terminal_id != null
          ? ([
              {
                label: t("till.removeFromTerminal"),
                onClick: openConfirmRemoveFromTerminalDialog,
                color: "warning",
                icon: <SmartphoneIcon />,
              } as const,
            ] as const)
          : []),
        { label: t("delete"), onClick: openConfirmDeleteDialog, color: "error", icon: <DeleteIcon /> },
      ]}
    >
      <DetailView>
        <DetailField label={t("till.id")} value={till.id} />
        <DetailField label={t("till.name")} value={till.name} />
        <DetailField label={t("till.description")} value={till.description} />
        {till.tse_id != null ? (
          <DetailField label={t("till.tseId")} linkTo={TseRoutes.detail(till.tse_id)} value={till.tse_id} />
        ) : (
          <DetailField label={t("till.tseId")} value="No tse" />
        )}
        <DetailField
          label={t("till.profile")}
          linkTo={TillProfileRoutes.detail(till.active_profile_id)}
          value={renderProfile(till.active_profile_id)}
        />
        {terminal && (
          <DetailField
            label={t("till.terminal")}
            linkTo={TerminalRoutes.detail(till.terminal_id)}
            value={terminal.name}
          />
        )}
        {till.current_cash_register_name != null && (
          <DetailField label={t("till.cashRegisterName")} value={till.current_cash_register_name} />
        )}
        {till.current_cash_register_balance != null && (
          <DetailNumberField
            label={t("till.cashRegisterBalance")}
            type="currency"
            value={till.current_cash_register_balance}
          />
        )}
      </DetailView>
      <OrderTable orders={orders ?? []} showCashierColumn />
      <TillSwitchTerminal open={switchTerminalOpen} tillId={till.id} onClose={() => setSwitchTerminalOpen(false)} />
    </DetailLayout>
  );
};
