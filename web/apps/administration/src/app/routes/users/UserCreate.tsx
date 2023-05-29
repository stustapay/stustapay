import { Paper, TextField, Button, LinearProgress, Typography } from "@mui/material";
import * as React from "react";
import { Formik, Form, FormikHelpers } from "formik";
import { NewUser, NewUserSchema } from "@stustapay/models";
import { toFormikValidationSchema } from "@stustapay/utils";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useCreateUserMutation } from "@api";
import { RoleSelect } from "./RoleSelect";

const initialValues: NewUser = {
  login: "",
  display_name: "",
  description: "",
  password: "",
  role_names: [],
};

export const UserCreate: React.FC = () => {
  const navigate = useNavigate();
  const [createUser] = useCreateUserMutation();

  const { t } = useTranslation();
  const handleSubmit = (values: NewUser, { setSubmitting }: FormikHelpers<NewUser>) => {
    setSubmitting(true);

    createUser(values)
      .unwrap()
      .then(() => {
        setSubmitting(false);
        navigate("/users");
      })
      .catch((err) => {
        setSubmitting(false);
        toast.error(t("userCreateError", { what: err.error }));
      });
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5">{t("createUser")}</Typography>
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={toFormikValidationSchema(NewUserSchema)}
      >
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
              value={values.display_name}
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
              value={values.description}
            />

            <TextField
              variant="standard"
              margin="normal"
              fullWidth
              type="password"
              name="password"
              label={t("userPassword")}
              error={touched.password && !!errors.password}
              helperText={(touched.password && errors.password) as string}
              onBlur={handleBlur}
              onChange={handleChange}
              value={values.password}
            />

            <RoleSelect
              label={t("user.roles")}
              variant="standard"
              margin="normal"
              value={values.role_names}
              onChange={(val) => setFieldValue("role_names", val)}
              error={touched.role_names && !!errors.role_names}
              helperText={(touched.role_names && errors.role_names) as string}
            />

            {isSubmitting && <LinearProgress />}
            <Button type="submit" fullWidth variant="contained" color="primary" disabled={isSubmitting} sx={{ mt: 1 }}>
              {t("add")}
            </Button>
          </Form>
        )}
      </Formik>
    </Paper>
  );
};
