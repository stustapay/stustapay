import { useUpdateTillProfileMutation, useGetTillProfileByIdQuery, selectTillProfileById } from "@api";
import * as React from "react";
import { TillProfileSchema } from "@models";
import { useParams, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TillProfileChange } from "./TillProfileChange";
import { Loading } from "@components/Loading";

export const TillProfileUpdate: React.FC = () => {
  const { t } = useTranslation(["tills", "common"]);
  const { profileId } = useParams();
  const { profile, isLoading } = useGetTillProfileByIdQuery(Number(profileId), {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      profile: data ? selectTillProfileById(data, Number(profileId)) : undefined,
    }),
  });
  const [updateProfile] = useUpdateTillProfileMutation();

  if (isLoading) {
    return <Loading />;
  }

  if (!profile) {
    return <Navigate to="/till-profiles" />;
  }

  return (
    <TillProfileChange
      headerTitle={t("profile.update")}
      submitLabel={t("update", { ns: "common" })}
      initialValues={profile}
      validationSchema={TillProfileSchema}
      onSubmit={updateProfile}
    />
  );
};
