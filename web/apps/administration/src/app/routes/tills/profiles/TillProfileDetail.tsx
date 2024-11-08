import {
  selectTillLayoutById,
  useDeleteTillProfileMutation,
  useGetTillProfileQuery,
  useListTillLayoutsQuery,
} from "@/api";
import { TillLayoutRoutes, TillProfileRoutes } from "@/app/routes";
import { DetailBoolField, DetailField, DetailLayout, DetailView } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";

export const TillProfileDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { profileId } = useParams();
  const navigate = useNavigate();
  const openModal = useOpenModal();
  const [deleteProfile] = useDeleteTillProfileMutation();
  const { data: profile, error } = useGetTillProfileQuery({ nodeId: currentNode.id, profileId: Number(profileId) });

  const { data: layouts, error: layoutError } = useListTillLayoutsQuery({ nodeId: currentNode.id });

  if (error || layoutError) {
    return <Navigate to={TillProfileRoutes.list()} />;
  }

  const openConfirmDeleteDialog = () => {
    openModal({
      type: "confirm",
      title: t("profile.delete"),
      content: t("profile.deleteDescription"),
      onConfirm: () => {
        deleteProfile({ nodeId: currentNode.id, profileId: Number(profileId) }).then(() =>
          navigate(TillProfileRoutes.list())
        );
      },
    });
  };

  if (profile === undefined || layouts === undefined) {
    return <Loading />;
  }

  const layout = selectTillLayoutById(layouts, profile.layout_id);

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
        { label: t("delete"), onClick: openConfirmDeleteDialog, color: "error", icon: <DeleteIcon /> },
      ]}
    >
      <DetailView>
        <DetailField label={t("profile.name")} value={profile.name} />
        <DetailField label={t("profile.description")} value={profile.description} />
        <DetailBoolField label={t("profile.allowTopUp")} value={profile.allow_top_up} />
        <DetailBoolField label={t("profile.allowCashOut")} value={profile.allow_cash_out} />
        <DetailBoolField label={t("profile.allowTicketSale")} value={profile.allow_ticket_sale} />
        {layout && (
          <DetailField label={t("profile.layout")} linkTo={TillLayoutRoutes.detail(layout.id)} value={layout.name} />
        )}
      </DetailView>
    </DetailLayout>
  );
};
