import { Paper, TextField, Button, LinearProgress, Typography } from "@mui/material";
import * as React from "react";
import { Formik, Form, FormikHelpers } from "formik";
import { NewUserRole, NewUserRoleSchema } from "@stustapay/models";
import { toFormikValidationSchema } from "@stustapay/utils";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useCreateUserRoleMutation } from "@api";
import { PrivilegeSelect } from "./PrivilegeSelect";

const initialValues: NewUserRole = {
  name: "",
  privileges: [],
};

export const UserRoleCreate: React.FC = () => {
  const navigate = useNavigate();
  const [createUserRole] = useCreateUserRoleMutation();

  const { t } = useTranslation(["users", "common"]);
  const handleSubmit = (values: NewUserRole, { setSubmitting }: FormikHelpers<NewUserRole>) => {
    setSubmitting(true);

    createUserRole(values)
      .unwrap()
      .then(() => {
        setSubmitting(false);
        navigate("/user-roles");
      })
      .catch((err) => {
        setSubmitting(false);
        toast.error(t("userRole.createError", { what: err.error }));
      });
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5">{t("userRole.create")}</Typography>
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={toFormikValidationSchema(NewUserRoleSchema)}
      >
        {({ values, handleBlur, handleChange, handleSubmit, isSubmitting, setFieldValue, errors, touched }) => (
          <Form onSubmit={handleSubmit}>
            <TextField
              variant="standard"
              margin="normal"
              fullWidth
              autoFocus
              name="name"
              label={t("userRole.name")}
              error={touched.name && !!errors.name}
              helperText={(touched.name && errors.name) as string}
              onBlur={handleBlur}
              onChange={handleChange}
              value={values.name}
            />

            <PrivilegeSelect
              label={t("userRole.privileges")}
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
