import * as React from "react";
import { useCreateUserTagSecretMutation } from "@/api";
import { UserTagRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";
import { Button, Stack, Typography } from "@mui/material";
import { generateUserTagSecretKeys } from "./userTagSecretKeys";

const NewUserTagSecretSchema = z.object({
  key0: z
    .string()
    .regex(/[0-9a-fA-F]+/, "must be hex encoded")
    .refine((val) => val.length % 2 === 0, "hex encoded strings must have even length"),
  key1: z
    .string()
    .regex(/[0-9a-fA-F]+/, "must be hex encoded")
    .refine((val) => val.length % 2 === 0, "hex encoded strings must have even length"),
  description: z.string(),
});

type NewUserTagSecret = z.infer<typeof NewUserTagSecretSchema>;

const initialValues: NewUserTagSecret = {
  key0: "",
  key1: "",
  description: "",
};

const SecretForm: React.FC<FormikProps<NewUserTagSecret>> = (props) => {
  const { t } = useTranslation();
  const handleGenerateSecret = () => {
    const generatedSecret = generateUserTagSecretKeys();
    props.setFieldValue("key0", generatedSecret.key0);
    props.setFieldValue("key1", generatedSecret.key1);
  };

  return (
    <Stack spacing={2}>
      <FormTextField autoFocus name="description" label={t("common.description")} formik={props} />
      <Button type="button" variant="outlined" onClick={handleGenerateSecret}>
        {t("userTagSecret.generate")}
      </Button>
      <Typography variant="body2" color="text.secondary">
        {t("userTagSecret.generateHint")}
      </Typography>
      <FormTextField name="key0" label={t("userTagSecret.key0")} formik={props} />
      <FormTextField name="key1" label={t("userTagSecret.key1")} formik={props} />
    </Stack>
  );
};

export const UserTagSecretCreate: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [createUserTagSecret] = useCreateUserTagSecretMutation();

  return (
    <CreateLayout
      title={t("userTagSecret.create")}
      submitLabel={t("add")}
      successRoute={UserTagRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewUserTagSecretSchema}
      onSubmit={(secret) => createUserTagSecret({ nodeId: currentNode.id, newUserTagSecret: secret })}
      form={SecretForm}
    />
  );
};
