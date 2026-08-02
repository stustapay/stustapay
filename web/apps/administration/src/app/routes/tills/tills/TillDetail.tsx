import { Delete as DeleteIcon, Edit as EditIcon, Smartphone as SmartphoneIcon } from "@mui/icons-material";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import { useRemoveFromTerminalMutation } from "@/api";
import { TerminalRoutes, TillProfileRoutes, TillRoutes, TseRoutes } from "@/app/routes";
import { DetailField, DetailLayout, DetailNumberField, DetailView } from "@/components";
import { OrderTable, TillSwitchTerminal } from "@/components/features";
import {
  getTerminalCollection,
  getTillCollection,
  getTillProfileCollection,
  getTseCollection,
  refetchTillTerminalCollections,
} from "@/db/collections";
import { useCurrentNode } from "@/hooks";

export const TillDetail: React.FC = () => {
  const { t } = useTranslation();
  const { tillId } = useParams();
  const { currentNode } = useCurrentNode();
  const navigate = useNavigate();
  const openModal = useOpenModal();

  const [removeFromTerminal] = useRemoveFromTerminalMutation();
  const {
    data: till,
    isLoading: isTillLoading,
    isError: isTillError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ tills: getTillCollection(currentNode.id) })
        .where(({ tills }) => eq(tills.id, Number(tillId)))
        .join(
          { profiles: getTillProfileCollection(currentNode.id) },
          ({ profiles, tills }) => eq(tills.active_profile_id, profiles.id),
          "inner" as const
        )
        .join(
          { terminals: getTerminalCollection(currentNode.id) },
          ({ terminals, tills }) => eq(tills.terminal_id, terminals.id),
          "left" as const
        )
        .join(
          { tses: getTseCollection(currentNode.id) },
          ({ tills, tses }) => eq(tills.tse_id, tses.id),
          "left" as const
        )
        .select(({ tills, profiles, terminals, tses }) => ({
          ...tills,
          profile: profiles,
          terminal: terminals,
          tse: tses,
        }))
        .findOne(),
    [currentNode.id, tillId]
  );
  const [switchTerminalOpen, setSwitchTerminalOpen] = React.useState(false);

  if (isTillError) {
    toast.error("Error loading tills or orders");
    return <Navigate to={TillRoutes.action("list")} />;
  }

  if (isTillLoading || !till) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = () => {
    openModal({
      type: "confirm",
      title: t("till.delete"),
      content: t("till.deleteDescription"),
      onConfirm: () => {
        getTillCollection(currentNode.id)
          .delete(Number(tillId))
          .isPersisted.promise.then(() => navigate(TillRoutes.action("list")));
      },
    });
  };

  const openConfirmRemoveFromTerminalDialog = () => {
    if (!till.terminal) {
      return;
    }
    openModal({
      type: "confirm",
      title: t("till.removeFromTerminal"),
      content: t("till.removeFromTerminalDescription", { terminalName: till.terminal.name }),
      onConfirm: () => {
        removeFromTerminal({ nodeId: currentNode.id, tillId: Number(tillId) }).then(() =>
          refetchTillTerminalCollections(currentNode.id)
        );
      },
    });
  };

  return (
    <DetailLayout
      title={till.name}
      routes={TillRoutes}
      elementNodeId={till.node_id}
      actions={[
        {
          label: t("edit"),
          onClick: () => navigate(TillRoutes.edit(tillId)),
          color: "primary",
          icon: <EditIcon />,
        },
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
        {
          label: t("delete"),
          onClick: openConfirmDeleteDialog,
          color: "error",
          icon: <DeleteIcon />,
        },
      ]}
    >
      <DetailView>
        <DetailField label={t("till.id")} value={till.id} />
        <DetailField label={t("till.name")} value={till.name} />
        <DetailField label={t("till.description")} value={till.description} />
        {till.tse ? (
          <DetailField label={t("till.tseId")} linkTo={TseRoutes.detail(till.tse.id)} value={till.tse.name} />
        ) : (
          <DetailField label={t("till.tseId")} value="No tse" />
        )}
        <DetailField
          label={t("till.profile")}
          linkTo={TillProfileRoutes.detail(till.active_profile_id)}
          value={till.profile.name}
        />
        {till.terminal && (
          <DetailField
            label={t("till.terminal")}
            linkTo={TerminalRoutes.detail(till.terminal_id)}
            value={till.terminal.name}
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
      <OrderTable tillId={Number(tillId)} showCashierColumn />
      <TillSwitchTerminal open={switchTerminalOpen} tillId={till.id} onClose={() => setSwitchTerminalOpen(false)} />
    </DetailLayout>
  );
};
