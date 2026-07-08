import { NewUserTagVariant, NewUserTagVariantSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { useCreateUserTagVariantMutation } from "@/api";
import { UserTagVariantRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
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
  const [createUserTagVariant] = useCreateUserTagVariantMutation();

  return (
    <CreateLayout
      title={t("userTagVariant.create")}
      successRoute={UserTagVariantRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewUserTagVariantSchema}
      onSubmit={(userTagVariant) => createUserTagVariant({ nodeId: currentNode.id, newUserTagVariant: userTagVariant })}
      form={UserTagVariantForm}
    />
  );
};
