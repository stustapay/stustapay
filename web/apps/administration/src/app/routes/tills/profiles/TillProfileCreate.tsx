import { NewTillProfileSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { withPrivilegeGuard } from "@/app/layout";
import { TillProfileRoutes } from "@/app/routes";
import { CreateLayoutV2 } from "@/components";
import { NewTillProfile } from "@/db/api/generated";
import { generateId, getTillProfileCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { TillProfileForm } from "./TillProfileForm";

const initialValues: NewTillProfile = {
  name: "",
  description: "",
  layout_id: undefined as unknown as number, // TODO
  allow_cash_out: false,
  allow_top_up: false,
  allow_ticket_sale: false,
  allow_ticket_vouchers: false,
  enable_ssp_payment: true,
  enable_cash_payment: false,
  enable_card_payment: false,
};

export const TillProfileCreate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  return (
    <CreateLayoutV2
      title={t("profile.create")}
      successRoute={TillProfileRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewTillProfileSchema}
      onSubmit={(profile) =>
        getTillProfileCollection(currentNode.id).insert({
          ...profile,
          id: generateId(),
          node_id: currentNode.id,
        })
      }
      form={TillProfileForm}
    />
  );
});
