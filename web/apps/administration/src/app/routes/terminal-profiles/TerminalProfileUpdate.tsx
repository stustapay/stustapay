import { useUpdateTerminalProfileMutation, useGetTerminalProfileByIdQuery } from "@api";
import * as React from "react";
import { TerminalProfileSchema } from "@models";
import { useParams, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TerminalProfileChange } from "./TerminalProfileChange";
import { Loading } from "@components/Loading";

export const TerminalProfileUpdate: React.FC = () => {
  const { t } = useTranslation(["terminals", "common"]);
  const { profileId } = useParams();
  const { data: profile, isLoading } = useGetTerminalProfileByIdQuery(Number(profileId));
  const [updateProfile] = useUpdateTerminalProfileMutation();

  if (isLoading) {
    return <Loading />;
  }

  if (!profile) {
    return <Navigate to="/terminal-profiles" />;
  }

  return (
    <TerminalProfileChange
      headerTitle={t("profile.update")}
      submitLabel={t("update", { ns: "common" })}
      initialValues={profile}
      validationSchema={TerminalProfileSchema}
      onSubmit={updateProfile}
    />
  );
};
