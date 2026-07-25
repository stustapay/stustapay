import { Loading } from "@stustapay/components";
import { TillProfileSchema } from "@stustapay/models";
import { eq, useLiveQuery } from "@tanstack/react-db";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

import { withPrivilegeGuard } from "@/app/layout";
import { TillProfileRoutes } from "@/app/routes";
import { EditLayoutV2 } from "@/components";
import { getTillProfileCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { TillProfileForm } from "./TillProfileForm";

export const TillProfileUpdate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { profileId } = useParams();
  const {
    data: profile,
    isLoading,
    isError,
  } = useLiveQuery(
    (q) =>
      q
        .from({ profiles: getTillProfileCollection(currentNode.id) })
        .where(({ profiles }) => eq(profiles.id, Number(profileId)))
        .findOne(),
    [currentNode.id, profileId],
  );

  if (isError) {
    return <Navigate to={TillProfileRoutes.list()} />;
  }

  if (isLoading || !profile) {
    return <Loading />;
  }

  return (
    <EditLayoutV2
      title={t("profile.update")}
      successRoute={TillProfileRoutes.detail(profile.id)}
      initialValues={profile}
      validationSchema={TillProfileSchema}
      onSubmit={(p) =>
        getTillProfileCollection(currentNode.id).update(profile.id, (draft) => {
          draft.name = p.name;
          draft.description = p.description;
          draft.layout_id = p.layout_id;
          draft.allow_top_up = p.allow_top_up;
          draft.allow_cash_out = p.allow_cash_out;
          draft.allow_ticket_sale = p.allow_ticket_sale;
          draft.allow_ticket_vouchers = p.allow_ticket_vouchers;
          draft.enable_ssp_payment = p.enable_ssp_payment;
          draft.enable_cash_payment = p.enable_cash_payment;
          draft.enable_card_payment = p.enable_card_payment;
        })
      }
      form={TillProfileForm}
    />
  );
});
