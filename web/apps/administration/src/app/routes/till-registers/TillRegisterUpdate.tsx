import { selectTillRegisterById, useListCashRegistersAdminQuery, useUpdateRegisterMutation } from "@api";
import * as React from "react";
import { TillRegisterSchema } from "@stustapay/models";
import { Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loading } from "@stustapay/components";
import { TillRegisterChange } from "./TillRegisterChange";

export const TillRegisterUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { registerId } = useParams();
  const { register, isLoading, error } = useListCashRegistersAdminQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      register: data ? selectTillRegisterById(data, Number(registerId)) : undefined,
    }),
  });
  const [update] = useUpdateRegisterMutation();

  if (error) {
    return <Navigate to="/till-registers" />;
  }

  if (isLoading || !register) {
    return <Loading />;
  }

  return (
    <TillRegisterChange
      headerTitle={t("register.update")}
      submitLabel={t("update")}
      initialValues={register}
      validationSchema={TillRegisterSchema}
      onSubmit={(register) => update({ registerId: register.id, newCashRegister: register })}
    />
  );
};
