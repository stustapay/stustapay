import { Loading } from "@stustapay/components";
import { NewUserTagVariantSchema } from "@stustapay/models";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

import { UserTagVariantRoutes } from "@/app/routes";
import { EditLayoutV2 } from "@/components";
import { getUserTagVariantCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { UserTagVariantForm } from "./UserTagTypeForm";

export const UserTagVariantUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { userTagVariantId } = useParams();
  const {
    data: userTagVariant,
    isLoading,
    isError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ userTagVariants: getUserTagVariantCollection(currentNode.id) })
        .where(({ userTagVariants }) => eq(userTagVariants.id, Number(userTagVariantId)))
        .findOne(),
    [currentNode.id, userTagVariantId]
  );

  if (isError) {
    return <Navigate to={UserTagVariantRoutes.list()} />;
  }

  if (isLoading || !userTagVariant) {
    return <Loading />;
  }

  return (
    <EditLayoutV2
      title={t("userTagVariant.update")}
      successRoute={UserTagVariantRoutes.list()}
      initialValues={{
        variant_name: userTagVariant.variant_name,
        description: userTagVariant.description ?? "",
        priority: userTagVariant.priority ?? 0,
      }}
      validationSchema={NewUserTagVariantSchema}
      onSubmit={(values) =>
        getUserTagVariantCollection(currentNode.id).update(userTagVariant.id, (draft) => {
          draft.variant_name = values.variant_name;
          draft.description = values.description;
          draft.priority = values.priority;
        })
      }
      form={UserTagVariantForm}
    />
  );
};
