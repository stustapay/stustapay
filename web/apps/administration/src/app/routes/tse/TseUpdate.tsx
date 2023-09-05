import { selectTseById, useListTsesQuery, useUpdateTseMutation } from "@/api";
import { TseRoutes } from "@/app/routes";
import { EditLayout } from "@components";
import { useCurrentNode } from "@hooks";
import { Loading } from "@stustapay/components";
import { UpdateTseSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useParams, Navigate } from "react-router-dom";
import { UpdateTseForm } from "./UpdateTseForm";

export const TseUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { tseId } = useParams();
  const { currentNode } = useCurrentNode();
  const { tse, isLoading, error } = useListTsesQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        tse: data ? selectTseById(data, Number(tseId)) : undefined,
      }),
    }
  );
  const [updateTse] = useUpdateTseMutation();

  if (isLoading || !tse) {
    return <Loading />;
  }

  if (error) {
    return <Navigate to={TseRoutes.list()} />;
  }

  return (
    <EditLayout
      title={t("tse.update")}
      successRoute={TseRoutes.detail(tse.id)}
      submitLabel={t("update")}
      initialValues={tse}
      validationSchema={UpdateTseSchema}
      onSubmit={(t) => updateTse({ nodeId: currentNode.id, tseId: tse.id, updateTse: t })}
      form={UpdateTseForm}
    />
  );
};
