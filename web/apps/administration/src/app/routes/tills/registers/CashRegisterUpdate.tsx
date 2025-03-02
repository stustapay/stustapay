import { selectCashRegisterById, useListCashRegistersAdminQuery, useUpdateRegisterMutation } from "@/api";
import { CashRegistersRoutes } from "@/app/routes";
import { EditLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Loading } from "@stustapay/components";
import { CashRegisterSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";
import { CashRegisterForm } from "./CashRegisterForm";
import { withPrivilegeGuard } from "@/app/layout";

export const CashRegisterUpdate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { registerId } = useParams();
  const { register, isLoading, error } = useListCashRegistersAdminQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        register: data ? selectCashRegisterById(data, Number(registerId)) : undefined,
      }),
    }
  );
  const [update] = useUpdateRegisterMutation();

  if (error) {
    return <Navigate to={CashRegistersRoutes.list()} />;
  }

  if (isLoading || !register) {
    return <Loading />;
  }

  return (
    <EditLayout
      title={t("register.update")}
      submitLabel={t("update")}
      successRoute={CashRegistersRoutes.list()}
      initialValues={register}
      validationSchema={CashRegisterSchema}
      onSubmit={(r) => update({ nodeId: currentNode.id, registerId: register.id, newCashRegister: r })}
      form={CashRegisterForm}
    />
  );
});
