import {
  selectCashierById,
  selectTillById,
  useDeleteRegisterMutation,
  useGetCashRegisterAdminQuery,
  useListCashiersQuery,
  useListTillsQuery,
} from "@/api";
import { CashierRoutes, CashRegistersRoutes, TillRoutes } from "@/app/routes";
import { ButtonLink, DetailField, DetailLayout, DetailNumberField, DetailView } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Delete as DeleteIcon, Edit as EditIcon, SwapHoriz as SwapHorizIcon } from "@mui/icons-material";
import { Loading } from "@stustapay/components";
import { useOpenModal } from "@stustapay/modal-provider";
import { getUserName } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";

export const CashRegisterDetail: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { registerId } = useParams();
  const navigate = useNavigate();
  const openModal = useOpenModal();
  const [deleteRegister] = useDeleteRegisterMutation();
  const { data: register, error } = useGetCashRegisterAdminQuery({
    nodeId: currentNode.id,
    registerId: Number(registerId),
  });
  const { data: tills } = useListTillsQuery({ nodeId: currentNode.id });
  const { data: cashiers } = useListCashiersQuery({ nodeId: currentNode.id });

  if (error) {
    return <Navigate to={CashRegistersRoutes.list()} />;
  }
  if (register === undefined || tills === undefined || cashiers === undefined) {
    return <Loading />;
  }

  const openConfirmDeleteDialog = () => {
    openModal({
      type: "confirm",
      title: t("register.deleteRegister"),
      content: t("register.deleteRegisterDescription"),
      onConfirm: () => {
        deleteRegister({ nodeId: currentNode.id, registerId: Number(registerId) }).then(() =>
          navigate(CashRegistersRoutes.list())
        );
      },
    });
  };

  return (
    <DetailLayout
      title={register.name}
      routes={CashRegistersRoutes}
      elementNodeId={register.node_id}
      actions={[
        {
          label: t("edit"),
          onClick: () => navigate(CashRegistersRoutes.edit(registerId)),
          color: "primary",
          icon: <EditIcon />,
        },
        {
          label: t("register.transfer"),
          color: "primary",
          icon: <SwapHorizIcon />,
          onClick: () => navigate(`${CashRegistersRoutes.detail(register.id)}/transfer`),
          disabled: register.current_cashier_id == null,
        },
        { label: t("delete"), onClick: openConfirmDeleteDialog, color: "error", icon: <DeleteIcon /> },
      ]}
    >
      <DetailView>
        <DetailField label={t("register.name")} value={register.name} />
        <DetailNumberField
          label={t("register.currentBalance")}
          value={register.balance}
          type="currency"
          secondaryAction={
            register.balance !== 0 &&
            register.current_cashier_id != null && (
              <ButtonLink to={CashierRoutes.detailAction(register.current_cashier_id, "close-out")}>
                {t("cashier.closeOut")}
              </ButtonLink>
            )
          }
        />
        {register.current_cashier_id != null && (
          <DetailField
            label={t("register.currentCashier")}
            linkTo={CashierRoutes.detail(register.current_cashier_id)}
            value={getUserName(selectCashierById(cashiers, register.current_cashier_id))}
          />
        )}
        {register.current_till_id != null && (
          <DetailField
            label={t("register.currentTill")}
            linkTo={TillRoutes.detail(register.current_till_id)}
            value={selectTillById(tills, register.current_till_id)?.name}
          />
        )}
      </DetailView>
    </DetailLayout>
  );
};
