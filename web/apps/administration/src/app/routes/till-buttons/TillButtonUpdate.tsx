import { useUpdateTillButtonMutation, useGetTillButtonByIdQuery, selectTillButtonById } from "@api";
import * as React from "react";
import { useParams, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loading } from "@stustapay/components";
import { TillButtonChange } from "./TillButtonChange";
import { UpdateTillButtonSchema } from "@stustapay/models";

export const TillButtonUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { buttonId } = useParams();
  const { button, isLoading, error } = useGetTillButtonByIdQuery(Number(buttonId), {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      button: data ? selectTillButtonById(data, Number(buttonId)) : undefined,
    }),
  });
  const [updateButton] = useUpdateTillButtonMutation();

  if (error) {
    return <Navigate to="/till-buttons" />;
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
      onSubmit={updateButton}
    />
  );
};
