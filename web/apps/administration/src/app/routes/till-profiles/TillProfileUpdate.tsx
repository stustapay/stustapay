import { useGetTillProfileQuery, useUpdateTillProfileMutation } from "@api";
import * as React from "react";
import { TillProfileSchema } from "@stustapay/models";
import { Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TillProfileChange } from "./TillProfileChange";
import { Loading } from "@stustapay/components";

export const TillProfileUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { profileId } = useParams();
  const { data: profile, isLoading, error } = useGetTillProfileQuery({ profileId: Number(profileId) });
  const [updateProfile] = useUpdateTillProfileMutation();

  if (error) {
    return <Navigate to="/till-profiles" />;
  }

  if (isLoading || !profile) {
    return <Loading />;
  }

  return (
    <TillProfileChange
      headerTitle={t("profile.update")}
      submitLabel={t("update")}
      initialValues={profile}
      validationSchema={TillProfileSchema}
      onSubmit={(profile) => updateProfile({ profileId: profile.id, newTillProfile: profile })}
    />
  );
};
