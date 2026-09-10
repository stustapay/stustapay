import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { TillLayoutRoutes, TillProfileRoutes } from "@/app/routes";
import { DetailBoolField, DetailField, DetailLayout, DetailView } from "@/components";
import { getTillLayoutCollection, getTillProfileCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

export const TillProfileDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { profileId } = useParams();
  const navigate = useNavigate();
  const openModal = useOpenModal();

  const {
    data: profile,
    isLoading,
    isError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ profiles: getTillProfileCollection(currentNode.id) })
        .where(({ profiles }) => eq(profiles.id, Number(profileId)))
        .join(
          { layouts: getTillLayoutCollection(currentNode.id) },
          ({ layouts, profiles }) => eq(profiles.layout_id, layouts.id),
          "left" as const
        )
        .select(({ profiles, layouts }) => ({
          ...profiles,
          layout: layouts,
        }))
        .findOne(),
    [currentNode.id, profileId]
  );

  if (isError) {
    return <Navigate to={TillProfileRoutes.list()} />;
  }

  if (isLoading || !profile) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = () => {
    openModal({
      type: "confirm",
      title: t("profile.delete"),
      content: t("profile.deleteDescription"),
      onConfirm: () => {
        getTillProfileCollection(currentNode.id)
          .delete(Number(profileId))
          .isPersisted.promise.then(() => navigate(TillProfileRoutes.list()));
      },
    });
  };

  return (
    <DetailLayout
      title={profile.name}
      routes={TillProfileRoutes}
      elementNodeId={profile.node_id}
      actions={[
        {
          label: t("edit"),
          onClick: () => navigate(TillProfileRoutes.edit(profileId)),
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
        <DetailField label={t("profile.name")} value={profile.name} />
        <DetailField label={t("profile.description")} value={profile.description} />
        <DetailBoolField label={t("profile.allowTopUp")} value={profile.allow_top_up} />
        <DetailBoolField label={t("profile.allowCashOut")} value={profile.allow_cash_out} />
        <DetailBoolField label={t("profile.allowTicketSale")} value={profile.allow_ticket_sale} />
        <DetailBoolField label={t("profile.allowTicketVouchers")} value={profile.allow_ticket_vouchers} />
        <DetailBoolField label={t("profile.enableSspPayment")} value={profile.enable_ssp_payment} />
        <DetailBoolField label={t("profile.enableCashPayment")} value={profile.enable_cash_payment} />
        <DetailBoolField label={t("profile.enableCardPayment")} value={profile.enable_card_payment} />
        <DetailBoolField label={t("profile.useTtpForCardPayment")} value={profile.use_ttp_for_card_payment} />
        {profile.layout && (
          <DetailField
            label={t("profile.layout")}
            linkTo={TillLayoutRoutes.detail(profile.layout.id)}
            value={profile.layout.name}
          />
        )}
      </DetailView>
    </DetailLayout>
  );
};
