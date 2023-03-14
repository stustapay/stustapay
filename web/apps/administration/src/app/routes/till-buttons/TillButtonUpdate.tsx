import { useUpdateTillButtonMutation, useGetTillButtonByIdQuery } from "@api";
import * as React from "react";
import { useParams, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loading } from "@components/Loading";
import { TillButtonChange } from "./TillButtonChange";
import { UpdateTillButtonSchema } from "@models";

export const TillButtonUpdate: React.FC = () => {
  const { t } = useTranslation(["tills", "common"]);
  const { buttonId } = useParams();
  const { data: button, isLoading } = useGetTillButtonByIdQuery(Number(buttonId));
  const [updateButton] = useUpdateTillButtonMutation();

  if (isLoading) {
    return <Loading />;
  }

  if (!button) {
    return <Navigate to="/till-buttons" />;
  }

  return (
    <TillButtonChange
      headerTitle={t("button.update")}
      submitLabel={t("update", { ns: "common" })}
      initialValues={button}
      validationSchema={UpdateTillButtonSchema}
      onSubmit={updateButton}
    />
  );
};
