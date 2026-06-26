import { CloudUpload as CloudUploadIcon } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  styled,
} from "@mui/material";
import { Select } from "@stustapay/components";
import { FormTextField } from "@stustapay/form-components";
import { ProductRestrictionSchema } from "@stustapay/models";
import { FormikProps } from "formik";
import * as Papa from "papaparse";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";

import { UserTagSecret, useCreateUserTagsMutation, useListUserTagSecretsQuery } from "@/api";
import { UserTagRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { RestrictionSelect } from "@/components/features";
import { useCurrentNode } from "@/hooks";

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  bottom: 0,
  left: 0,
  whiteSpace: "nowrap",
  width: 1,
});

const CsvTagsSchema = z.array(
  z.object({
    pin: z.string(),
    variant: z.string().optional(),
  })
);

const NewUserTagsSchema = z.object({
  secret_id: z.number().int(),
  restriction: ProductRestrictionSchema.nullable(),
  batch_variant: z.string().optional(),
  tags: CsvTagsSchema,
});

type NewUserTags = z.infer<typeof NewUserTagsSchema>;

const initialValues: NewUserTags = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  secret_id: null as any,
  restriction: null,
  batch_variant: "",
  tags: [],
};

const parseCsv = (csvContent: string): Array<{ pin: string; variant?: string }> | null => {
  const parsed = Papa.parse(csvContent, {
    delimiter: ",",
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length > 0) {
    toast.error(`There was an error in the csv file: ${parsed.errors.join(", ")}`);
    return null;
  }
  const validated = CsvTagsSchema.safeParse(parsed.data);
  if (!validated.success) {
    toast.error(`There was an error in the csv file: ${validated.error.issues}`);
    return null;
  }
  return validated.data;
};

const TagsForm: React.FC<FormikProps<NewUserTags>> = (props) => {
  const { currentNode } = useCurrentNode();
  const { t } = useTranslation();
  const { values, setFieldValue } = props;
  const { data: userTagsSecrets, error } = useListUserTagSecretsQuery({ nodeId: currentNode.id });

  if (error) {
    return <Alert severity="error">{`Error loading user tag secrets: ${error}`}</Alert>;
  }

  if (!userTagsSecrets) {
    return null;
  }

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length !== 1) {
      toast.error("No file was selected");
      return;
    }
    const file = event.target.files[0];

    const reader = new FileReader();
    reader.addEventListener("load", (loadedFile) => {
      const res = loadedFile.target?.result;
      if (!res) {
        toast.error("Error uploading file");
        return;
      }
      if (typeof res !== "string") {
        toast.error("Error uploading file, expected a plain text file but got something else");
        return;
      }
      const tags = parseCsv(res);
      if (tags) {
        setFieldValue("tags", tags);
      }
    });
    reader.readAsText(file);
  };

  const resolveVariant = (rowVariant?: string) => {
    const trimmedRow = rowVariant?.trim();
    if (trimmedRow) {
      return trimmedRow;
    }
    const trimmedBatch = values.batch_variant?.trim();
    return trimmedBatch ?? null;
  };

  return (
    <>
      <RestrictionSelect
        label={t("userTag.restriction")}
        value={values.restriction}
        onChange={(val) => setFieldValue("restriction", val)}
        multiple={false}
      />
      <Select
        label={t("userTag.secret")}
        multiple={false}
        value={userTagsSecrets.find((v) => v.id === values.secret_id) ?? null}
        options={userTagsSecrets}
        formatOption={(secret: UserTagSecret) => secret.description}
        onChange={(secret) => secret && setFieldValue("secret_id", secret.id)}
      />
      <FormTextField
        label={t("userTag.batchVariant")}
        description={t("userTag.batchVariantDescription")}
        name="batch_variant"
        formik={props}
      />

      <Typography>{t("userTag.uploadPinCsvDescription")}</Typography>

      <Button
        component="label"
        role={undefined}
        variant="contained"
        startIcon={<CloudUploadIcon />}
        sx={{ maxWidth: 400 }}
      >
        {t("userTag.uploadPinCsv")}
        <VisuallyHiddenInput type="file" accept="text/csv" onChange={(event) => handleCsvUpload(event)} />
      </Button>

      {values.tags.length > 0 && (
        <Box>
          <Typography>{t("userTag.willCreate", { nTags: values.tags.length })}</Typography>
          <Typography>{t("userTag.firstNTags", { actualNum: Math.min(values.tags.length, 10) })}</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t("userTag.pin")}</TableCell>
                  <TableCell>{t("userTag.variant")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {values.tags.slice(0, 10).map((tag) => (
                  <TableRow key={tag.pin}>
                    <TableCell>{tag.pin}</TableCell>
                    <TableCell>{resolveVariant(tag.variant) ?? ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </>
  );
};

export const UserTagsCreate: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [createUserTags] = useCreateUserTagsMutation();

  return (
    <CreateLayout
      title={t("userTag.create")}
      successRoute={UserTagRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewUserTagsSchema}
      onSubmit={(userTags) =>
        createUserTags({
          nodeId: currentNode.id,
          newUserTags: userTags.tags.map((tag) => {
            const rowVariant = tag.variant?.trim();
            const batchVariant = userTags.batch_variant?.trim();
            return {
              pin: tag.pin,
              secret_id: userTags.secret_id,
              restriction: userTags.restriction,
              variant: rowVariant || batchVariant || null,
            };
          }),
        })
      }
      form={TagsForm}
    />
  );
};
