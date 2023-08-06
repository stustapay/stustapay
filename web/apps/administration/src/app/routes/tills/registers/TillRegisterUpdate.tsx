import { TillRegistersRoutes } from "@/app/routes";
import { selectTillRegisterById, useListCashRegistersAdminQuery, useUpdateRegisterMutation } from "@api";
import { EditLayout } from "@components";
import { Loading } from "@stustapay/components";
import { TillRegisterSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";
import { TillRegisterForm } from "./TillRegisterForm";

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
    return <Navigate to={TillRegistersRoutes.list()} />;
  }

  if (isLoading || !register) {
    return <Loading />;
  }

  return (
    <EditLayout
      title={t("register.update")}
      submitLabel={t("update")}
      successRoute={TillRegistersRoutes.detail(register.id)}
      initialValues={register}
      validationSchema={TillRegisterSchema}
      onSubmit={(r) => update({ registerId: register.id, newCashRegister: r })}
      form={TillRegisterForm}
    />
  );
};
