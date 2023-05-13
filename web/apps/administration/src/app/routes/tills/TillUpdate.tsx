import { useUpdateTillMutation, useGetTillByIdQuery, selectTillById } from "@api";
import * as React from "react";
import { UpdateTillSchema } from "@stustapay/models";
import { useParams, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TillChange } from "./TillChange";
import { Loading } from "@stustapay/components";

export const TillUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { tillId } = useParams();
  const { till, isLoading } = useGetTillByIdQuery(Number(tillId), {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      till: data ? selectTillById(data, Number(tillId)) : undefined,
    }),
  });
  const [updateTill] = useUpdateTillMutation();

  if (isLoading) {
    return <Loading />;
  }

  if (!till) {
    return <Navigate to="/tills" />;
  }

  return (
    <TillChange
      headerTitle={t("till.update")}
      submitLabel={t("update")}
      initialValues={till}
      validationSchema={UpdateTillSchema}
      onSubmit={updateTill}
    />
  );
};
