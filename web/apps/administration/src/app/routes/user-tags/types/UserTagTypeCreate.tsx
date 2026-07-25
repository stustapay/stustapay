import { NewUserTagVariant, NewUserTagVariantSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { UserTagVariantRoutes } from "@/app/routes";
import { CreateLayoutV2 } from "@/components";
import { generateId, getUserTagVariantCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { UserTagVariantForm } from "./UserTagTypeForm";

const initialValues: NewUserTagVariant = {
  variant_name: "",
  description: "",
  priority: 0,
};

export const UserTagVariantCreate: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  return (
    <CreateLayoutV2
      title={t("userTagVariant.create")}
      successRoute={UserTagVariantRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewUserTagVariantSchema}
      onSubmit={(userTagVariant) =>
        getUserTagVariantCollection(currentNode.id).insert({
          ...userTagVariant,
          id: generateId(),
          node_id: currentNode.id,
        })
      }
      form={UserTagVariantForm}
    />
  );
};
