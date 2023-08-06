import { TillButtonsRoutes } from "@/app/routes";
import { useGetTillButtonQuery, useUpdateTillButtonMutation } from "@api";
import { EditLayout } from "@components";
import { Loading } from "@stustapay/components";
import { UpdateTillButtonSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";
import { TillButtonForm } from "./TillButtonForm";

export const TillButtonUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { buttonId } = useParams();
  const { data: button, isLoading, error } = useGetTillButtonQuery({ buttonId: Number(buttonId) });
  const [updateButton] = useUpdateTillButtonMutation();

  if (error) {
    return <Navigate to={TillButtonsRoutes.list()} />;
  }

  if (isLoading || !button) {
    return <Loading />;
  }

  return (
    <EditLayout
      title={t("button.update")}
      submitLabel={t("update")}
      successRoute={TillButtonsRoutes.detail(button.id)}
      initialValues={button}
      validationSchema={UpdateTillButtonSchema}
      onSubmit={(b) => updateButton({ buttonId: button.id, newTillButton: b })}
      form={TillButtonForm}
    />
  );
};
