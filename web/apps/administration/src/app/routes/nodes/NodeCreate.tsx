import { useCreateNodeMutation } from "@/api";
import { isErrorResp } from "@/api/utils";
import { useCurrentNode } from "@/hooks";
import { Button, Container, LinearProgress, Stack, Typography } from "@mui/material";
import { FormSelect, FormTextField } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { NodeSettingsSchema, ObjectTypeSchema, type NodeSettingsSchemaType } from "./types";
import { withPrivilegeGuard } from "@/app/layout";
import { useNavigate } from "react-router-dom";

const initialValues: NodeSettingsSchemaType = {
  name: "",
  description: "",
  forbidden_objects_at_node: [
    "account",
    "product",
    "tax_rate",
    "terminal",
    "ticket",
    "till",
    "tse",
    "user",
    "user_role",
    "user_tag",
  ],
  forbidden_objects_in_subtree: [
    "account",
    "product",
    "tax_rate",
    "terminal",
    "ticket",
    "till",
    "tse",
    "user",
    "user_role",
    "user_tag",
  ],
};

export const NodeCreate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const navigate = useNavigate();

  const [createNode] = useCreateNodeMutation();

  const handleSubmit = (values: NodeSettingsSchemaType, { setSubmitting }: FormikHelpers<NodeSettingsSchemaType>) => {
    setSubmitting(true);
    createNode({
      nodeId: currentNode.id,
      newNode: values,
    })
      .unwrap()
      .then((resp) => {
        navigate(`/node/${resp.id}`);
        setSubmitting(false);
      })
      .catch((e) => {
        if (isErrorResp(e)) {
          toast.error(`Error creating node: ${e.error.data.detail}`);
        }
        setSubmitting(false);
      });
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" textAlign="center">
        {t("settings.createNode.heading", { parentNodeName: currentNode.name })}
      </Typography>
      <Formik
        initialValues={initialValues}
        enableReinitialize={true}
        validationSchema={toFormikValidationSchema(NodeSettingsSchema)}
        onSubmit={handleSubmit}
      >
        {(formik) => (
          <Form>
            <Stack spacing={2}>
              <FormTextField label={t("settings.general.name")} name="name" formik={formik} />
              <FormTextField label={t("settings.general.description")} name="description" formik={formik} />
              <FormSelect
                label={t("settings.general.forbidden_objects_at_node")}
                name="forbidden_objects_at_node"
                formik={formik}
                multiple={true}
                checkboxes={true}
                formatOption={(o: string) => o}
                options={ObjectTypeSchema.options}
              />
              <FormSelect
                label={t("settings.general.forbidden_objects_in_subtree")}
                name="forbidden_objects_in_subtree"
                formik={formik}
                multiple={true}
                checkboxes={true}
                formatOption={(o: string) => o}
                options={ObjectTypeSchema.options}
              />
              {formik.isSubmitting && <LinearProgress />}
              <Button
                type="submit"
                color="primary"
                variant="contained"
                disabled={formik.isSubmitting || Object.keys(formik.touched).length === 0}
              >
                {t("common.create")}
              </Button>
            </Stack>
          </Form>
        )}
      </Formik>
    </Container>
  );
});
