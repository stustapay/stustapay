import { NewTillProfile, useCreateTillProfileMutation } from "@/api";
import { TillProfileRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { NewTillProfileSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { TillProfileForm } from "./TillProfileForm";
import { withPrivilegeGuard } from "@/app/layout";

const initialValues: NewTillProfile = {
  name: "",
  description: "",
  layout_id: undefined as unknown as number, // TODO
  allow_cash_out: false,
  allow_top_up: false,
  allow_ticket_sale: false,
};

export const TillProfileCreate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [createProfile] = useCreateTillProfileMutation();

  return (
    <CreateLayout
      title={t("profile.create")}
      submitLabel={t("add")}
      successRoute={TillProfileRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewTillProfileSchema}
      onSubmit={(profile) => createProfile({ nodeId: currentNode.id, newTillProfile: profile })}
      form={TillProfileForm}
    />
  );
});
