import { useGetTillQuery, useUpdateTillMutation } from "@/api";
import { TillRoutes } from "@/app/routes";
import { EditLayout } from "@/components";
import { Loading } from "@stustapay/components";
import { UpdateTillSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";
import { TillForm } from "./TillForm";

export const TillUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { tillId } = useParams();
  const { data: till, isLoading, error } = useGetTillQuery({ tillId: Number(tillId) });
  const [updateTill] = useUpdateTillMutation();

  if (error) {
    return <Navigate to={TillRoutes.list()} />;
  }

  if (isLoading || !till) {
    return <Loading />;
  }

  return (
    <EditLayout
      title={t("till.update")}
      submitLabel={t("update")}
      successRoute={TillRoutes.detail(till.id)}
      initialValues={till}
      form={TillForm}
      validationSchema={UpdateTillSchema}
      onSubmit={(t) => updateTill({ tillId: till.id, newTill: t })}
    />
  );
};
