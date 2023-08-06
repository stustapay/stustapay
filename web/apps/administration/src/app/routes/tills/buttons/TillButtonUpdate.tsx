import { useGetTillButtonQuery, useUpdateTillButtonMutation } from "@api";
import * as React from "react";
import { Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loading } from "@stustapay/components";
import { TillButtonChange } from "./TillButtonChange";
import { UpdateTillButtonSchema } from "@stustapay/models";
import { TillButtonsRoutes } from "@/app/routes";

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
    <TillButtonChange
      headerTitle={t("button.update")}
      submitLabel={t("update")}
      initialValues={button}
      validationSchema={UpdateTillButtonSchema}
      onSubmit={(button) => updateButton({ buttonId: button.id, newTillButton: button })}
    />
  );
};
