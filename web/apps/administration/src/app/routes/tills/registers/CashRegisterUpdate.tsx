import { Loading } from "@stustapay/components";
import { UpdateCashRegisterSchema } from "@stustapay/models";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

import { withPrivilegeGuard } from "@/app/layout";
import { CashRegistersRoutes } from "@/app/routes";
import { EditLayoutV2 } from "@/components";
import { getCashRegisterCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { CashRegisterForm } from "./CashRegisterForm";

export const CashRegisterUpdate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { registerId } = useParams();
  const {
    data: register,
    isLoading,
    isError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ registers: getCashRegisterCollection(currentNode.id) })
        .where(({ registers }) => eq(registers.id, Number(registerId)))
        .findOne(),
    [currentNode.id, registerId]
  );

  if (isError) {
    return <Navigate to={CashRegistersRoutes.list()} />;
  }

  if (isLoading || !register) {
    return <Loading />;
  }

  return (
    <EditLayoutV2
      title={t("register.update")}
      successRoute={CashRegistersRoutes.detail(register.id)}
      initialValues={register}
      validationSchema={UpdateCashRegisterSchema}
      onSubmit={(updatedRegister) =>
        getCashRegisterCollection(currentNode.id).update(register.id, (draft) => {
          draft.name = updatedRegister.name;
        })
      }
      form={CashRegisterForm}
    />
  );
});
