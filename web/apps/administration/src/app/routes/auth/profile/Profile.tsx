import { useUpdateProfileMutation } from "@/api";
import { ThemeSelect } from "@/components/features";
import { useCurrentUser } from "@/hooks";
import { setCurrentUser, useAppDispatch } from "@/store";
import { Alert, AlertTitle, Button, LinearProgress, List, ListItem, ListItemText, Paper, Stack, Typography } from "@mui/material";
import { FormTextField } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";
import { PasswordChange } from "./PasswordChange";
import i18n from "../../../../i18n";

const validationSchema = z.object({
  email: z.union([z.literal(""), z.string().email(i18n.t("auth.invalidEmail"))]),
});

type ProfileFormValues = z.infer<typeof validationSchema>;

export const Profile: React.FC = () => {
  const { t } = useTranslation();
  const currentUser = useCurrentUser();
  const dispatch = useAppDispatch();
  const [updateProfile] = useUpdateProfileMutation();

  if (!currentUser) {
    return (
      <Alert severity="error">
        <AlertTitle>Error loading current user</AlertTitle>
      </Alert>
    );
  }

  const initialValues: ProfileFormValues = {
    email: currentUser.email ?? "",
  };

  const handleSubmit = (values: ProfileFormValues, { setSubmitting }: FormikHelpers<ProfileFormValues>) => {
    setSubmitting(true);
    const email = values.email.trim();

    updateProfile({ updateCurrentUserProfilePayload: { email: email === "" ? null : email } })
      .unwrap()
      .then((updatedUser) => {
        dispatch(setCurrentUser(updatedUser));
        toast.success(t("auth.profileUpdated"));
        setSubmitting(false);
      })
      .catch((err) => {
        const reason = err?.data?.detail ?? err?.error ?? t("common.notSet");
        toast.error(t("auth.profileUpdateFailed", { reason }));
        setSubmitting(false);
      });
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">{t("auth.profile")}</Typography>
        <List>
          <ListItem>
            <ListItemText primary={t("user.login")} secondary={currentUser.login} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("user.displayName")} secondary={currentUser.display_name} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("user.description")} secondary={currentUser.description} />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t("settings.theme.title")}
              secondary={<ThemeSelect variant="standard" fullWidth />}
            />
          </ListItem>
        </List>
        <Formik
          enableReinitialize
          initialValues={initialValues}
          onSubmit={handleSubmit}
          validationSchema={toFormikValidationSchema(validationSchema)}
        >
          {(formik) => (
            <Form onSubmit={formik.handleSubmit}>
              <Stack spacing={2}>
                <FormTextField
                  variant="outlined"
                  label={t("email")}
                  name="email"
                  formik={formik}
                />
                {formik.isSubmitting && <LinearProgress />}
                <Button type="submit" variant="contained" disabled={formik.isSubmitting}>
                  {t("save")}
                </Button>
              </Stack>
            </Form>
          )}
        </Formik>
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">{t("auth.changePassword")}</Typography>
        <PasswordChange />
      </Paper>
    </Stack>
  );
};
