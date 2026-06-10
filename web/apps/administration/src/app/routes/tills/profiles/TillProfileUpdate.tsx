import { Loading } from "@stustapay/components";
import { TillProfileSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";

import { useGetTillProfileQuery, useUpdateTillProfileMutation } from "@/api";
import { withPrivilegeGuard } from "@/app/layout";
import { TillProfileRoutes } from "@/app/routes";
import { EditLayout } from "@/components";
import { useCurrentNode } from "@/hooks";

import { TillProfileForm } from "./TillProfileForm";

export const TillProfileUpdate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { profileId } = useParams();
  const {
    data: profile,
    isLoading,
    error,
  } = useGetTillProfileQuery({ nodeId: currentNode.id, profileId: Number(profileId) });
  const [updateProfile] = useUpdateTillProfileMutation();

  if (error) {
    return <Navigate to={TillProfileRoutes.list()} />;
  }

  if (isLoading || !profile) {
    return <Loading />;
  }

  return (
    <EditLayout
      title={t("profile.update")}
      successRoute={TillProfileRoutes.detail(profile.id)}
      initialValues={profile}
      validationSchema={TillProfileSchema}
      onSubmit={(p) => updateProfile({ nodeId: currentNode.id, profileId: profile.id, newTillProfile: p })}
      form={TillProfileForm}
    />
  );
});
