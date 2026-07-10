import { Loading } from "@stustapay/components";
import { NewUserTagVariantSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

import { useGetUserTagVariantQuery, useUpdateUserTagVariantMutation } from "@/api";
import { UserTagVariantRoutes } from "@/app/routes";
import { EditLayout } from "@/components";
import { useCurrentNode } from "@/hooks";

import { UserTagVariantForm } from "./UserTagTypeForm";

export const UserTagVariantUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { userTagVariantId } = useParams();
  const {
    data: userTagVariant,
    isLoading,
    error,
  } = useGetUserTagVariantQuery({ nodeId: currentNode.id, userTagVariantId: Number(userTagVariantId) });
  const [updateUserTagVariant] = useUpdateUserTagVariantMutation();

  if (error) {
    return <Navigate to={UserTagVariantRoutes.list()} />;
  }

  if (isLoading || !userTagVariant) {
    return <Loading />;
  }

  return (
    <EditLayout
      title={t("userTagVariant.update")}
      successRoute={UserTagVariantRoutes.list()}
      initialValues={{
        variant_name: userTagVariant.variant_name,
        description: userTagVariant.description ?? "",
        priority: userTagVariant.priority ?? 0,
      }}
      validationSchema={NewUserTagVariantSchema}
      onSubmit={(values) =>
        updateUserTagVariant({
          nodeId: currentNode.id,
          userTagVariantId: userTagVariant.id,
          newUserTagVariant: values,
        })
      }
      form={UserTagVariantForm}
    />
  );
};
