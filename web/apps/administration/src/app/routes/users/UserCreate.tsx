import { Paper, TextField, Button, LinearProgress, Typography } from "@mui/material";
import * as React from "react";
import { Formik, Form, FormikHelpers } from "formik";
import { NewUser, NewUserSchema } from "@models/users";
import { toFormikValidationSchema } from "@stustapay/utils";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useCreateUserMutation } from "@api";
import { PrivilegeSelect } from "./PrivilegeSelect";

const initialValues: NewUser = {
  name: "",
  description: "",
  password: "",
  privileges: [],
};

export const UserCreate: React.FC = () => {
  const navigate = useNavigate();
  const [createUser] = useCreateUserMutation();

  const { t } = useTranslation(["users", "common"]);
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
              name="name"
              label={t("userName")}
              error={touched.name && !!errors.name}
              helperText={(touched.name && errors.name) as string}
              onBlur={handleBlur}
              onChange={handleChange}
              value={values.name}
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

            <PrivilegeSelect
              label={t("userPrivileges")}
              variant="standard"
              margin="normal"
              value={values.privileges}
              onChange={(val) => setFieldValue("privileges", val)}
              error={touched.privileges && !!errors.privileges}
              helperText={(touched.privileges && errors.privileges) as string}
            />

            {isSubmitting && <LinearProgress />}
            <Button type="submit" fullWidth variant="contained" color="primary" disabled={isSubmitting} sx={{ mt: 1 }}>
              {t("add", { ns: "common" })}
            </Button>
          </Form>
        )}
      </Formik>
    </Paper>
  );
};
