import { Alert, Button, Checkbox, FormControlLabel, LinearProgress, Paper, Typography } from "@mui/material";
import * as React from "react";
import { Form, Formik, FormikHelpers } from "formik";
import { z } from "zod";
import { PrivilegeSchema } from "@stustapay/models";
import { toFormikValidationSchema } from "@stustapay/utils";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { selectUserRoleById, useListUserRolesQuery, useUpdateUserRoleMutation } from "@api";
import { Loading } from "@stustapay/components";
import { PrivilegeSelect } from "./PrivilegeSelect";

const UpdateSchema = z.object({
  id: z.number(),
  is_privileged: z.boolean(),
  privileges: z.array(PrivilegeSchema),
});
type FormValues = z.infer<typeof UpdateSchema>;

export const UserRoleUpdate: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userId } = useParams();
  const [updateUserRole] = useUpdateUserRoleMutation();
  const { userRole, isLoading } = useListUserRolesQuery(undefined, {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      userRole: data ? selectUserRoleById(data, Number(userId)) : undefined,
    }),
  });

  if (isLoading) {
    return <Loading />;
  }

  const handleSubmit = (values: FormValues, { setSubmitting }: FormikHelpers<FormValues>) => {
    setSubmitting(true);

    updateUserRole({ userRoleId: Number(userId), updateUserRolePrivilegesPayload: values })
      .unwrap()
      .then(() => {
        setSubmitting(false);
        navigate("/user-roles");
      })
      .catch((err) => {
        setSubmitting(false);
        toast.error(t("userRole.updateError", { what: err.error }));
      });
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5">{t("userRole.update")}</Typography>
      {userRole === undefined ? (
        <Alert color="error">Error while loading user</Alert>
      ) : (
        <Formik
          initialValues={userRole}
          onSubmit={handleSubmit as any} // TODO: fix me
          validationSchema={toFormikValidationSchema(UpdateSchema)}
        >
          {({ values, handleBlur, handleChange, handleSubmit, isSubmitting, setFieldValue, errors, touched }) => (
            <Form onSubmit={handleSubmit}>
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
                margin="normal"
                variant="standard"
                value={values.privileges}
                onChange={(val) => setFieldValue("privileges", val)}
                error={touched.privileges && !!errors.privileges}
                helperText={(touched.privileges && errors.privileges) as string}
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
