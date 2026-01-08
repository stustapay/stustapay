import * as React from "react";
import { UserTagSecret, useCreateUserTagsMutation, useListUserTagSecretsQuery } from "@/api";
import { UserTagRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { ProductRestrictionSchema } from "@stustapay/models";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { RestrictionSelect } from "@/components/features";
import { FormikProps } from "formik";
import { Select } from "@stustapay/components";
import { FormTextField } from "@stustapay/form-components";
import {
  Alert,
  Box,
  Button,
  FormHelperText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  styled,
} from "@mui/material";
import { CloudUpload as CloudUploadIcon } from "@mui/icons-material";
import { toast } from "react-toastify";
import * as Papa from "papaparse";

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
    uid: z.number().optional(),
    is_vip: z.boolean().optional(),
    comment: z.string().optional(),
    group_tag: z.string().optional(),
  })
);

const NewUserTagsSchema = z.object({
  secret_id: z.number().int(),
  restriction: ProductRestrictionSchema.nullable(),
  default_group_tag: z.string().optional(),
  tags: CsvTagsSchema,
});

type NewUserTags = z.infer<typeof NewUserTagsSchema>;

const initialValues: NewUserTags = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  secret_id: null as any,
  restriction: null,
  default_group_tag: "",
  tags: [],
};

const parseCsv = (
  csvContent: string
): Array<{ pin: string; uid?: number; is_vip?: boolean; comment?: string; group_tag?: string }> | null => {
  const parsed = Papa.parse<{ pin: string; uid?: string; is_vip?: string; comment?: string; group_tag?: string }>(
    csvContent,
    {
      delimiter: ",",
      header: true,
      skipEmptyLines: true,
    }
  );
  
  if (parsed.errors.length > 0) {
    toast.error(`There was an error in the csv file: ${parsed.errors.join(", ")}`);
    return null;
  }
  
  // Process the data to convert string values to appropriate types
  const processedData = parsed.data.map(item => ({
    pin: item.pin,
    uid: item.uid ? Number(item.uid) : undefined,
    is_vip: item.is_vip ? (item.is_vip.toLowerCase() === 'true' || item.is_vip === '1') : undefined,
    comment: item.comment || undefined,
    group_tag: item.group_tag || undefined
  }));
  
  console.log(processedData);
  const validated = CsvTagsSchema.safeParse(processedData);
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
    reader.onload = (loadedFile) => {
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
    };
    reader.readAsText(file);
  };

  return (
    <>
      <RestrictionSelect
        label={t("userTag.restriction")}
        value={values.restriction}
        onChange={(val) => setFieldValue("restriction", val)}
        multiple={false}
      />
      <FormTextField
        name="default_group_tag"
        label={t("userTag.groupTagDefault")}
        variant="outlined"
        formik={props}
      />
      <FormHelperText>{t("userTag.groupTagDefaultHelper")}</FormHelperText>
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
        <VisuallyHiddenInput type="file" onChange={(event) => handleCsvUpload(event)} />
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
                  <TableCell>{t("userTag.uid")}</TableCell>
                  <TableCell>{t("userTag.vipStatus")}</TableCell>
                  <TableCell>{t("userTag.comment")}</TableCell>
                  <TableCell>{t("userTag.groupTag")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {values.tags.slice(0, 10).map((tag) => (
                  <TableRow key={tag.pin}>
                    <TableCell>{tag.pin}</TableCell>
                    <TableCell>{tag.uid}</TableCell>
                    <TableCell>{tag.is_vip ? t("common.yes") : t("common.no")}</TableCell>
                    <TableCell>{tag.comment}</TableCell>
                    <TableCell>{tag.group_tag}</TableCell>
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
      submitLabel={t("add")}
      successRoute={UserTagRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewUserTagsSchema}
      onSubmit={(userTags) =>
        createUserTags({
          nodeId: currentNode.id,
          newUserTags: userTags.tags.map((t) => {
            const defaultGroupTag = userTags.default_group_tag?.trim() || undefined;
            return {
              pin: t.pin,
              secret_id: userTags.secret_id,
              restriction: userTags.restriction,
              uid: t.uid,
              is_vip: t.is_vip,
              comment: t.comment,
              group_tag: t.group_tag ?? defaultGroupTag,
            };
          }),
        })
      }
      form={TagsForm}
    />
  );
};
