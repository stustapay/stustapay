import { useGetTillQuery, useUpdateTillMutation } from "@api";
import * as React from "react";
import { UpdateTillSchema } from "@stustapay/models";
import { Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TillChange } from "./TillChange";
import { Loading } from "@stustapay/components";

export const TillUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { tillId } = useParams();
  const { data: till, isLoading, error } = useGetTillQuery({ tillId: Number(tillId) });
  const [updateTill] = useUpdateTillMutation();

  if (error) {
    return <Navigate to="/tills" />;
  }

  if (isLoading || !till) {
    return <Loading />;
  }

  return (
    <TillChange
      headerTitle={t("till.update")}
      submitLabel={t("update")}
      initialValues={till}
      validationSchema={UpdateTillSchema}
      onSubmit={(till) => updateTill({ tillId: till.id, newTill: till })}
    />
  );
};
