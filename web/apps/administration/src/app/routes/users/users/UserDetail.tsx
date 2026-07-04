import { Delete as DeleteIcon, Edit as EditIcon, PointOfSale as PointOfSaleIcon } from "@mui/icons-material";
import { Paper } from "@mui/material";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import {
  selectTerminalById,
  useDeleteUserMutation,
  useGetUserQuery,
  useGetUserVoucherGrantStatsQuery,
  useListTerminalsQuery,
} from "@/api";
import { TerminalRoutes, UserRoutes, UserTagRoutes } from "@/app/routes";
import { UserRoleAssignmentsSection } from "@/app/routes/users";
import { DetailField, DetailLayout, DetailView } from "@/components";
import { useCurrentNode } from "@/hooks";

import { UserCashierSection } from "./UserCashierSection";

export const UserDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { userId } = useParams();
  const navigate = useNavigate();
  const [deleteUser] = useDeleteUserMutation();
  const { data: user, error } = useGetUserQuery({ nodeId: currentNode.id, userId: Number(userId) });
  const { data: voucherGrantStats } = useGetUserVoucherGrantStatsQuery({
    nodeId: currentNode.id,
    userId: Number(userId),
  });
  const {
    data: terminals,
    isLoading: isTerminalsLoading,
    error: terminalError,
  } = useListTerminalsQuery({
    nodeId: currentNode.id,
  });
  const openModal = useOpenModal();

  const getTerminal = (id: number) => {
    if (!terminals) {
      return undefined;
    }
    return selectTerminalById(terminals, id);
  };

  const openConfirmDeleteDialog = () => {
    openModal({
      type: "confirm",
      title: t("deleteUser"),
      content: t("deleteUserDescription"),
      onConfirm: () => {
        deleteUser({ nodeId: currentNode.id, userId: Number(userId) }).then(() => navigate(UserRoutes.list()));
      },
    });
  };

  if (user === undefined || isTerminalsLoading) {
    return <Loading />;
  }
  if (error || terminalError) {
    return <Navigate to={UserRoutes.list()} />;
  }

  const cashierActions =
    user.cash_register_id != null && user.cash_drawer_balance !== 0 && user.cash_drawer_balance != null
      ? ([
          {
            label: t("cashier.closeOut"),
            onClick: () => navigate(UserRoutes.detailAction(userId, "close-out", user.node_id)),
            icon: <PointOfSaleIcon />,
          } as const,
        ] as const)
      : [];

  return (
    <DetailLayout
      title={user.login}
      routes={UserRoutes}
      elementNodeId={user.node_id}
      actions={[
        ...cashierActions,
        {
          label: t("user.changePassword.title"),
          onClick: () => navigate(UserRoutes.detailAction(userId, "change-password")),
          color: "primary",
          icon: <EditIcon />,
        },
        {
          label: t("edit"),
          onClick: () => navigate(UserRoutes.edit(userId)),
          color: "primary",
          icon: <EditIcon />,
        },
        { label: t("delete"), onClick: openConfirmDeleteDialog, color: "error", icon: <DeleteIcon /> },
      ]}
    >
      <DetailView>
        <DetailField label={t("userLogin")} value={user.login} />
        <DetailField label={t("userDescription")} value={user.description} />
        {user.user_tag_id ? (
          <DetailField
            label={t("user.tagId")}
            linkTo={UserTagRoutes.detail(user.user_tag_id)}
            value={user.user_tag_id}
          />
        ) : (
          <DetailField label={t("user.tagId")} value={t("user.noTagAssigned")} />
        )}
        {user.terminal_ids.length !== 0 ? (
          user.terminal_ids.map((id) => (
            <DetailField
              key={id}
              label={t("user.terminal")}
              value={getTerminal(id)?.name}
              linkTo={TerminalRoutes.detail(getTerminal(id)?.id)}
            />
          ))
        ) : (
          <DetailField label={t("user.terminal")} value={t("user.notLoggedInAtTerminal")} />
        )}
        <DetailField label={t("user.vouchersGranted")} value={voucherGrantStats?.vouchers_granted ?? 0} />
      </DetailView>
      <Paper sx={{ p: 1 }}>
        <UserRoleAssignmentsSection userId={Number(userId)} />
      </Paper>
      <UserCashierSection cashier={user} />
    </DetailLayout>
  );
};
