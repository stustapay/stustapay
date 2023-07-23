import { Button, Checkbox, FormControlLabel, LinearProgress, Paper, TextField, Typography } from "@mui/material";
import * as React from "react";
import { Form, Formik, FormikHelpers } from "formik";
import { NewUserRole, NewUserRoleSchema } from "@stustapay/models";
import { toFormikValidationSchema } from "@stustapay/utils";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useCreateUserRoleMutation } from "@api";
import { PrivilegeSelect } from "./PrivilegeSelect";

const initialValues: NewUserRole = {
  name: "",
  is_privileged: false,
  privileges: [],
};

export const UserRoleCreate: React.FC = () => {
  const navigate = useNavigate();
  const [createUserRole] = useCreateUserRoleMutation();

  const { t } = useTranslation();
  const handleSubmit = (values: NewUserRole, { setSubmitting }: FormikHelpers<NewUserRole>) => {
    setSubmitting(true);

    createUserRole({ newUserRole: values })
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
            <FormControlLabel
              label={t("userRole.isPrivileged")}
              control={
                <Checkbox
                  checked={values.is_privileged}
                  onChange={(evt) => setFieldValue("is_privileged", evt.target.checked)}
                />
              }
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
              {t("add")}
            </Button>
          </Form>
        )}
      </Formik>
    </Paper>
  );
};
