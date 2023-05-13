import { useUpdateTillProfileMutation, useGetTillProfileByIdQuery, selectTillProfileById } from "@api";
import * as React from "react";
import { TillProfileSchema } from "@stustapay/models";
import { useParams, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TillProfileChange } from "./TillProfileChange";
import { Loading } from "@stustapay/components";

export const TillProfileUpdate: React.FC = () => {
  const { t } = useTranslation();
  const { profileId } = useParams();
  const { profile, isLoading, error } = useGetTillProfileByIdQuery(Number(profileId), {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      profile: data ? selectTillProfileById(data, Number(profileId)) : undefined,
    }),
  });
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
      onSubmit={updateProfile}
    />
  );
};
