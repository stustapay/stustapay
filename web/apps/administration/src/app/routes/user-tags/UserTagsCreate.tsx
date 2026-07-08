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
import { FormikProps } from "formik";
import * as Papa from "papaparse";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";

import {
  UserTagSecret,
  selectUserTagVariantAll,
  useCreateUserTagsMutation,
  useListUserTagSecretsQuery,
  useListUserTagVariantsQuery,
} from "@/api";
import { UserTagRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { UserTagVariantSelect } from "@/components/features";
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
    variants: z.string().optional(),
  })
);

const NewUserTagsSchema = z.object({
  secret_id: z.number().int(),
  variant_ids: z.array(z.number().int()),
  tags: CsvTagsSchema,
});

type NewUserTags = z.infer<typeof NewUserTagsSchema>;

const initialValues: NewUserTags = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  secret_id: null as any,
  variant_ids: [],
  tags: [],
};

const parseCsv = (csvContent: string): Array<{ pin: string; variants?: string }> | null => {
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

const parseVariantNames = (value?: string) =>
  (value ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

const TagsForm: React.FC<FormikProps<NewUserTags>> = (props) => {
  const { currentNode } = useCurrentNode();
  const { t } = useTranslation();
  const { values, setFieldValue } = props;
  const { data: userTagsSecrets, error } = useListUserTagSecretsQuery({ nodeId: currentNode.id });
  const { userTagVariants } = useListUserTagVariantsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        userTagVariants: data ? selectUserTagVariantAll(data) : [],
      }),
    }
  );

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

  const resolveVariantNames = (rowVariants?: string) => {
    const rowNames = parseVariantNames(rowVariants);
    if (rowNames.length > 0) {
      return rowNames;
    }
    return userTagVariants
      .filter((variant) => values.variant_ids.includes(variant.id))
      .map((variant) => variant.variant_name);
  };

  return (
    <>
      <UserTagVariantSelect
        label={t("userTag.variants")}
        helperText={t("userTag.batchVariantsDescription")}
        value={values.variant_ids}
        onChange={(val) => setFieldValue("variant_ids", val)}
        multiple={true}
      />
      <Select
        label={t("userTag.secret")}
        multiple={false}
        value={userTagsSecrets.find((v) => v.id === values.secret_id) ?? null}
        options={userTagsSecrets}
        formatOption={(secret: UserTagSecret) => secret.description}
        onChange={(secret) => secret && setFieldValue("secret_id", secret.id)}
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
                  <TableCell>{t("userTag.variants")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {values.tags.slice(0, 10).map((tag) => (
                  <TableRow key={tag.pin}>
                    <TableCell>{tag.pin}</TableCell>
                    <TableCell>{resolveVariantNames(tag.variants).join(", ")}</TableCell>
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
          newUserTags: userTags.tags.map((tag) => ({
            pin: tag.pin,
            secret_id: userTags.secret_id,
            variant_ids: userTags.variant_ids,
            variant_names: parseVariantNames(tag.variants),
          })),
        })
      }
      form={TagsForm}
    />
  );
};
