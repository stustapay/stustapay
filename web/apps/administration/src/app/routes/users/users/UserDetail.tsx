import { Delete as DeleteIcon, Edit as EditIcon, PointOfSale as PointOfSaleIcon } from "@mui/icons-material";
import { Paper } from "@mui/material";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { useGetUserVoucherGrantStatsQuery } from "@/api";
import { TerminalRoutes, UserRoutes, UserTagRoutes } from "@/app/routes";
import { UserRoleAssignmentsSection } from "@/app/routes/users";
import { DetailField, DetailLayout, DetailView } from "@/components";
import { getTerminalCollection, getUserCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { UserCashierSection } from "./UserCashierSection";

export const UserDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { userId } = useParams();
  const navigate = useNavigate();
  const {
    data: user,
    isLoading: isUserLoading,
    isError: isUserError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ users: getUserCollection(currentNode.id) })
        .where(({ users }) => eq(users.id, Number(userId)))
        .findOne(),
    [currentNode.id, userId]
  );
  const { data: voucherGrantStats } = useGetUserVoucherGrantStatsQuery({
    nodeId: currentNode.id,
    userId: Number(userId),
  });
  const {
    data: terminals,
    isLoading: isTerminalsLoading,
    isError: terminalError,
  } = useLiveQuery((q) => q.from({ terminals: getTerminalCollection(currentNode.id) }), [currentNode.id]);
  const openModal = useOpenModal();

  const getTerminal = (id: number) => terminals?.find((terminal) => terminal.id === id);

  const openConfirmDeleteDialog = () => {
    openModal({
      type: "confirm",
      title: t("deleteUser"),
      content: t("deleteUserDescription"),
      onConfirm: () => {
        getUserCollection(currentNode.id)
          .delete(Number(userId))
          .isPersisted.promise.then(() => navigate(UserRoutes.list()));
      },
    });
  };

  if (isUserLoading || isTerminalsLoading) {
    return <Loading />;
  }
  if (isUserError || terminalError || !user) {
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
        {
          label: t("delete"),
          onClick: openConfirmDeleteDialog,
          color: "error",
          icon: <DeleteIcon />,
        },
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
