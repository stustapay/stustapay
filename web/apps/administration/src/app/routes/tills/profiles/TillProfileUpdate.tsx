import { useGetTillProfileQuery, useUpdateTillProfileMutation } from "@/api";
import { TillProfileRoutes } from "@/app/routes";
import { EditLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Loading } from "@stustapay/components";
import { TillProfileSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";
import { TillProfileForm } from "./TillProfileForm";

export const TillProfileUpdate: React.FC = () => {
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
      submitLabel={t("update")}
      initialValues={profile}
      validationSchema={TillProfileSchema}
      onSubmit={(p) => updateProfile({ nodeId: currentNode.id, profileId: profile.id, newTillProfile: p })}
      form={TillProfileForm}
    />
  );
};
