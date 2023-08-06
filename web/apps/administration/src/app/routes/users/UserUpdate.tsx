import { User, useGetUserQuery, useUpdateUserMutation } from "@/api";
import { UserRoutes } from "@/app/routes";
import { RoleSelect } from "@/components/features";
import { Alert, Button, LinearProgress, Paper, TextField, Typography } from "@mui/material";
import { Loading } from "@stustapay/components";
import { UserSchema } from "@stustapay/models";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

export const UserUpdate: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userId } = useParams();
  const [updateUser] = useUpdateUserMutation();
  const { data: user, isLoading } = useGetUserQuery({ userId: Number(userId) });

  if (isLoading) {
    return <Loading />;
  }

  const handleSubmit = (values: User, { setSubmitting }: FormikHelpers<User>) => {
    setSubmitting(true);

    updateUser({ userId: Number(userId), updateUserPayload: values })
      .unwrap()
      .then(() => {
        setSubmitting(false);
        navigate(UserRoutes.list());
      })
      .catch((err) => {
        setSubmitting(false);
        toast.error(t("userUpdateError", { what: err.error }));
      });
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5">{t("updateUser")}</Typography>
      {user === undefined ? (
        <Alert color="error">Error while loading user</Alert>
      ) : (
        <Formik initialValues={user} onSubmit={handleSubmit} validationSchema={toFormikValidationSchema(UserSchema)}>
          {({ values, handleBlur, handleChange, handleSubmit, isSubmitting, setFieldValue, errors, touched }) => (
            <Form onSubmit={handleSubmit}>
              <TextField
                variant="standard"
                margin="normal"
                fullWidth
                autoFocus
                name="login"
                label={t("userLogin")}
                error={touched.login && !!errors.login}
                helperText={(touched.login && errors.login) as string}
                onBlur={handleBlur}
                onChange={handleChange}
                value={values.login}
              />

              <TextField
                variant="standard"
                margin="normal"
                fullWidth
                name="display_name"
                label={t("userDisplayName")}
                error={touched.display_name && !!errors.display_name}
                helperText={(touched.display_name && errors.display_name) as string}
                onBlur={handleBlur}
                onChange={handleChange}
                value={values.display_name ?? ""}
              />

              <TextField
                variant="standard"
                margin="normal"
                fullWidth
                name="user_tag_uid_hex"
                label={t("user.tagUid")}
                error={touched.user_tag_uid_hex && !!errors.user_tag_uid_hex}
                helperText={(touched.user_tag_uid_hex && errors.user_tag_uid_hex) as string}
                onBlur={handleBlur}
                onChange={handleChange}
                value={values.user_tag_uid_hex}
              />

              <TextField
                variant="standard"
                margin="normal"
                fullWidth
                name="description"
                label={t("userDescription")}
                error={touched.description && !!errors.description}
                helperText={(touched.description && errors.description) as string}
                onBlur={handleBlur}
                onChange={handleChange}
                value={values.description ?? ""}
              />

              <RoleSelect
                label={t("user.roles")}
                margin="normal"
                variant="standard"
                value={values.role_names}
                onChange={(val) => setFieldValue("role_names", val)}
                error={touched.role_names && !!errors.role_names}
                helperText={(touched.role_names && errors.role_names) as string}
              />

              {isSubmitting && <LinearProgress />}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                disabled={isSubmitting}
                sx={{ mt: 1 }}
              >
                {t("update")}
              </Button>
            </Form>
          )}
        </Formik>
      )}
    </Paper>
  );
};
