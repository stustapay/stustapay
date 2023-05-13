import { selectTillRegisterById, useGetTillRegistersQuery, useUpdateTillRegisterMutation } from "@api";
import * as React from "react";
import { TillRegisterSchema } from "@stustapay/models";
import { useParams, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loading } from "@stustapay/components";
import { TillRegisterChange } from "./TillRegisterChange";

export const TillRegisterUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { registerId } = useParams();
  const { register, isLoading, error } = useGetTillRegistersQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      register: data ? selectTillRegisterById(data, Number(registerId)) : undefined,
    }),
  });
  const [update] = useUpdateTillRegisterMutation();

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
      onSubmit={update}
    />
  );
};
