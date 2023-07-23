import { useGetTillLayoutQuery, useUpdateTillLayoutMutation } from "@api";
import * as React from "react";
import { TillLayoutSchema } from "@stustapay/models";
import { Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TillLayoutChange } from "./TillLayoutChange";
import { Loading } from "@stustapay/components";

export const TillLayoutUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { layoutId } = useParams();
  const { data: layout, isLoading, error } = useGetTillLayoutQuery({ layoutId: Number(layoutId) });
  const [updateLayout] = useUpdateTillLayoutMutation();

  if (error) {
    return <Navigate to="/till-layouts" />;
  }

  if (isLoading || !layout) {
    return <Loading />;
  }

  return (
    <TillLayoutChange
      headerTitle={t("layout.update")}
      submitLabel={t("update")}
      initialValues={layout}
      validationSchema={TillLayoutSchema}
      onSubmit={(layout) => updateLayout({ layoutId: layout.id, newTillLayout: layout })}
    />
  );
};
