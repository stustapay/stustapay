import * as React from "react";
import { useCreateUserTagSecretMutation } from "@/api";
import { UserTagRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { FormTextField } from "@stustapay/form-components";
import { FormikProps } from "formik";

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

  return (
    <>
      <FormTextField autoFocus name="description" label={t("common.description")} formik={props} />
      <FormTextField name="key0" label={t("userTagSecret.key0")} formik={props} />
      <FormTextField name="key1" label={t("userTagSecret.key1")} formik={props} />
    </>
  );
};

export const UserTagSecretCreate: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [createUserTagSecret] = useCreateUserTagSecretMutation();

  return (
    <CreateLayout
      title={t("userTagSecret.create")}
      successRoute={UserTagRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewUserTagSecretSchema}
      onSubmit={(secret) => createUserTagSecret({ nodeId: currentNode.id, newUserTagSecret: secret })}
      form={SecretForm}
    />
  );
};
