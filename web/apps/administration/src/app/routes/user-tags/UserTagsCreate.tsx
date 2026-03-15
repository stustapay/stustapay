import * as React from "react";
import {
  UserTagSecret,
  useCreateUserTagsMutation,
  useListUserTagSecretsQuery,
} from "@/api";
import { UserTagRoutes } from "@/app/routes";
import { RestrictionSelect } from "@/components/features";
import { useCurrentNode } from "@/hooks";
import { ProductRestrictionSchema } from "@stustapay/models";
import { Select } from "@stustapay/components";
import { FormTextField } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { ChevronLeft } from "@mui/icons-material";
import { Form, Formik, FormikHelpers, FormikProps } from "formik";
import {
  Alert,
  Box,
  Button,
  FormHelperText,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Select as MuiSelect,
  SelectChangeEvent,
  Stack,
  Typography,
  styled,
} from "@mui/material";
import { CloudUpload as CloudUploadIcon } from "@mui/icons-material";
import { toast } from "react-toastify";
import * as Papa from "papaparse";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { UserTagGridEditor } from "./UserTagGridEditor";
import {
  collectUserTagGridIssues,
  createEmptyUserTagGridRow,
  createUserTagGridRows,
  serializeUserTagGridRows,
  type UserTagGridIssue,
  type UserTagGridRow,
} from "./userTagGrid";

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

type ColumnMapping = {
  pin: string | null;
  uid: string | null;
  is_vip: string | null;
  comment: string | null;
  group_tag: string | null;
};

const UserTagGridRowSchema = z.object({
  id: z.string(),
  pin: z.string().default(""),
  uid: z.string().optional().default(""),
  is_vip: z.string().optional().default(""),
  comment: z.string().optional().default(""),
  group_tag: z.string().optional().default(""),
});

export const NewUserTagsSchema = z
  .object({
    secret_id: z.number().int(),
    restriction: ProductRestrictionSchema.nullable(),
    default_group_tag: z.string().optional(),
    tags: z.array(UserTagGridRowSchema),
  })
  .superRefine((values, ctx) => {
    const issues = collectUserTagGridIssues(values.tags);
    issues.forEach((issue) => {
      if (issue.rowIndex == null || issue.field == null) {
        ctx.addIssue({
          code: "custom",
          path: ["tags"],
          message: issue.messageKey,
        });
        return;
      }

      ctx.addIssue({
        code: "custom",
        path: ["tags", issue.rowIndex, issue.field],
        message: issue.messageKey,
      });
    });
  });

export type NewUserTags = z.infer<typeof NewUserTagsSchema>;

export const initialValues: NewUserTags = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  secret_id: null as any,
  restriction: null,
  default_group_tag: "",
  tags: [createEmptyUserTagGridRow()],
};

const COLUMN_VARIANTS: Record<string, string[]> = {
  pin: ["pin", "PIN", "tag_pin", "Tag Pin", "tagPin", "tag-pin", "tag pin"],
  uid: ["uid", "UID", "tag_uid", "Tag UID", "tagUid", "tag-uid", "tag uid", "id", "ID", "tag_id", "Tag ID"],
  is_vip: ["is_vip", "isVip", "vip", "VIP", "is-vip", "is vip"],
  comment: ["comment", "Comment", "comments", "notes", "note", "Notes", "Note"],
  group_tag: ["group_tag", "groupTag", "group-tag", "group", "Group Tag", "group tag"],
};

const detectDelimiter = (csvContent: string): string => {
  const delimiters = [",", ";", "\t", "|"];
  let bestDelimiter = ",";
  let maxConsistentColumns = 0;

  for (const delimiter of delimiters) {
    const firstLine = csvContent.split("\n")[0];
    const columns = firstLine.split(delimiter);
    if (columns.length > maxConsistentColumns) {
      maxConsistentColumns = columns.length;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
};

const detectColumnMapping = (headers: string[]): ColumnMapping => {
  const mapping: ColumnMapping = {
    pin: null,
    uid: null,
    is_vip: null,
    comment: null,
    group_tag: null,
  };

  for (const [field, variants] of Object.entries(COLUMN_VARIANTS)) {
    const fieldKey = field as keyof ColumnMapping;
    for (const header of headers) {
      const normalizedHeader = header.trim().toLowerCase().replace(/[\s_-]/g, "");
      for (const variant of variants) {
        const normalizedVariant = variant.toLowerCase().replace(/[\s_-]/g, "");
        if (normalizedHeader === normalizedVariant) {
          mapping[fieldKey] = header;
          break;
        }
      }
      if (mapping[fieldKey]) {
        break;
      }
    }
  }

  return mapping;
};

const parseCsvToGridRows = (csvContent: string, columnMapping: ColumnMapping): UserTagGridRow[] | null => {
  const delimiter = detectDelimiter(csvContent);
  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    delimiter: delimiter || "",
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    const nonCriticalErrors = parsed.errors.filter((error) => error.code !== "MissingQuotes");
    if (nonCriticalErrors.length > 0) {
      toast.error(`There was an error in the csv file: ${nonCriticalErrors.map((error) => error.message).join(", ")}`);
      return null;
    }
  }

  if (!parsed.meta.fields || parsed.meta.fields.length === 0) {
    toast.error("CSV file appears to have no headers");
    return null;
  }

  if (!columnMapping.pin) {
    return null;
  }

  const importedRows = parsed.data.map((item) => ({
    pin: columnMapping.pin ? item[columnMapping.pin]?.trim() ?? "" : "",
    uid: columnMapping.uid ? item[columnMapping.uid]?.trim() ?? "" : "",
    is_vip: columnMapping.is_vip ? item[columnMapping.is_vip]?.trim() ?? "" : "",
    comment: columnMapping.comment ? item[columnMapping.comment]?.trim() ?? "" : "",
    group_tag: columnMapping.group_tag ? item[columnMapping.group_tag]?.trim() ?? "" : "",
  }));

  return createUserTagGridRows(importedRows);
};

export const buildCreateUserTagsPayload = (userTags: NewUserTags) => {
  const defaultGroupTag = userTags.default_group_tag?.trim() || undefined;
  return serializeUserTagGridRows(userTags.tags).map((tag) => ({
    pin: tag.pin,
    secret_id: userTags.secret_id,
    ...(userTags.restriction != null ? { restriction: userTags.restriction } : {}),
    ...(tag.uid != null ? { uid: tag.uid } : {}),
    ...(tag.is_vip != null ? { is_vip: tag.is_vip } : {}),
    ...(tag.comment != null ? { comment: tag.comment } : {}),
    ...((tag.group_tag ?? defaultGroupTag) != null ? { group_tag: tag.group_tag ?? defaultGroupTag } : {}),
  }));
};

const buildValidationSummary = (issues: UserTagGridIssue[]) => {
  const fieldIssues = issues.filter((issue) => issue.rowIndex != null);
  if (fieldIssues.length === 0) {
    return issues.map((issue) => issue.messageKey);
  }

  return fieldIssues.map((issue) => `${issue.messageKey}:${issue.rowIndex! + 1}`);
};

export const UserTagsCreateForm: React.FC<FormikProps<NewUserTags>> = (props) => {
  const { currentNode } = useCurrentNode();
  const { t } = useTranslation();
  const { values, errors, setFieldValue } = props;
  const { data: userTagsSecrets, error } = useListUserTagSecretsQuery({ nodeId: currentNode.id });
  const [csvHeaders, setCsvHeaders] = React.useState<string[]>([]);
  const [columnMapping, setColumnMapping] = React.useState<ColumnMapping>({
    pin: null,
    uid: null,
    is_vip: null,
    comment: null,
    group_tag: null,
  });
  const [showColumnMapping, setShowColumnMapping] = React.useState(false);
  const [csvContent, setCsvContent] = React.useState<string | null>(null);

  const gridIssues = React.useMemo(() => collectUserTagGridIssues(values.tags), [values.tags]);
  const nonEmptyRowCount = React.useMemo(
    () => serializeUserTagGridRows(values.tags).length,
    [values.tags]
  );
  const validationSummary = React.useMemo(() => buildValidationSummary(gridIssues), [gridIssues]);
  const showSecretError = userTagsSecrets && userTagsSecrets.length > 0 && values.secret_id == null;

  React.useEffect(() => {
    if (userTagsSecrets && userTagsSecrets.length === 1 && values.secret_id == null) {
      setFieldValue("secret_id", userTagsSecrets[0].id);
    }
  }, [setFieldValue, userTagsSecrets, values.secret_id]);

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
      const result = loadedFile.target?.result;
      if (typeof result !== "string") {
        toast.error("Error uploading file, expected a plain text file but got something else");
        return;
      }

      const parsed = Papa.parse<Record<string, string>>(result, {
        delimiter: detectDelimiter(result),
        header: true,
        skipEmptyLines: false,
        preview: 1,
        transformHeader: (header) => header.trim(),
      });

      if (!parsed.meta.fields || parsed.meta.fields.length === 0) {
        toast.error("CSV file appears to have no headers");
        return;
      }

      setCsvHeaders(parsed.meta.fields);
      setCsvContent(result);
      setColumnMapping(detectColumnMapping(parsed.meta.fields));
      setShowColumnMapping(true);
    };
    reader.readAsText(file);
  };

  const handleApplyMapping = () => {
    if (!csvContent) {
      return;
    }

    if (!columnMapping.pin) {
      toast.error(t("userTag.columnMapping.pinRequired"));
      return;
    }

    const importedRows = parseCsvToGridRows(csvContent, columnMapping);
    if (!importedRows) {
      return;
    }

    setFieldValue("tags", importedRows);
    setShowColumnMapping(false);
    toast.success(t("userTag.columnMapping.mappingApplied"));
  };

  return (
    <>
      <RestrictionSelect
        label={t("userTag.restriction")}
        value={values.restriction}
        onChange={(value) => setFieldValue("restriction", value)}
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
        value={userTagsSecrets.find((secret) => secret.id === values.secret_id) ?? null}
        options={userTagsSecrets}
        formatOption={(secret: UserTagSecret) => secret.description}
        onChange={(secret) => secret && setFieldValue("secret_id", secret.id)}
      />
      {userTagsSecrets.length === 0 && <Alert severity="warning">{t("userTag.noSecretConfigured")}</Alert>}
      {showSecretError && (
        <FormHelperText error>{t("userTag.secretRequired")}</FormHelperText>
      )}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h6">{t("userTag.grid.title")}</Typography>
          <UserTagGridEditor rows={values.tags} issues={gridIssues} onChange={(rows) => setFieldValue("tags", rows)} />
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h6">{t("userTag.uploadPinCsv")}</Typography>
          <Typography>{t("userTag.uploadPinCsvDescription")}</Typography>
          <Button
            component="label"
            role={undefined}
            variant="contained"
            startIcon={<CloudUploadIcon />}
            sx={{ maxWidth: 400 }}
          >
            {t("userTag.uploadPinCsv")}
            <VisuallyHiddenInput
              data-testid="user-tag-csv-upload"
              type="file"
              accept=".csv,.txt"
              onChange={handleCsvUpload}
            />
          </Button>
        </Stack>
      </Paper>

      {showColumnMapping && csvHeaders.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {t("userTag.columnMapping.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("userTag.columnMapping.description")}
          </Typography>
          <Stack spacing={2}>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ flex: "1 1 300px", minWidth: 200 }}>
                <FormHelperText>{t("userTag.pin") + " *"}</FormHelperText>
                <MuiSelect
                  value={columnMapping.pin ?? ""}
                  onChange={(event: SelectChangeEvent<string>) =>
                    setColumnMapping({ ...columnMapping, pin: event.target.value || null })
                  }
                  fullWidth
                  required
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>{t("userTag.columnMapping.notMapped")}</em>
                  </MenuItem>
                  {csvHeaders.map((header) => (
                    <MenuItem key={header} value={header}>
                      {header}
                    </MenuItem>
                  ))}
                </MuiSelect>
              </Box>
              <Box sx={{ flex: "1 1 300px", minWidth: 200 }}>
                <FormHelperText>{t("userTag.uid")}</FormHelperText>
                <MuiSelect
                  value={columnMapping.uid ?? ""}
                  onChange={(event: SelectChangeEvent<string>) =>
                    setColumnMapping({ ...columnMapping, uid: event.target.value || null })
                  }
                  fullWidth
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>{t("userTag.columnMapping.notMapped")}</em>
                  </MenuItem>
                  {csvHeaders.map((header) => (
                    <MenuItem key={header} value={header}>
                      {header}
                    </MenuItem>
                  ))}
                </MuiSelect>
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ flex: "1 1 300px", minWidth: 200 }}>
                <FormHelperText>{t("userTag.vipStatus")}</FormHelperText>
                <MuiSelect
                  value={columnMapping.is_vip ?? ""}
                  onChange={(event: SelectChangeEvent<string>) =>
                    setColumnMapping({ ...columnMapping, is_vip: event.target.value || null })
                  }
                  fullWidth
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>{t("userTag.columnMapping.notMapped")}</em>
                  </MenuItem>
                  {csvHeaders.map((header) => (
                    <MenuItem key={header} value={header}>
                      {header}
                    </MenuItem>
                  ))}
                </MuiSelect>
              </Box>
              <Box sx={{ flex: "1 1 300px", minWidth: 200 }}>
                <FormHelperText>{t("userTag.comment")}</FormHelperText>
                <MuiSelect
                  value={columnMapping.comment ?? ""}
                  onChange={(event: SelectChangeEvent<string>) =>
                    setColumnMapping({ ...columnMapping, comment: event.target.value || null })
                  }
                  fullWidth
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>{t("userTag.columnMapping.notMapped")}</em>
                  </MenuItem>
                  {csvHeaders.map((header) => (
                    <MenuItem key={header} value={header}>
                      {header}
                    </MenuItem>
                  ))}
                </MuiSelect>
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Box sx={{ flex: "1 1 300px", minWidth: 200 }}>
                <FormHelperText>{t("userTag.groupTag")}</FormHelperText>
                <MuiSelect
                  value={columnMapping.group_tag ?? ""}
                  onChange={(event: SelectChangeEvent<string>) =>
                    setColumnMapping({ ...columnMapping, group_tag: event.target.value || null })
                  }
                  fullWidth
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>{t("userTag.columnMapping.notMapped")}</em>
                  </MenuItem>
                  {csvHeaders.map((header) => (
                    <MenuItem key={header} value={header}>
                      {header}
                    </MenuItem>
                  ))}
                </MuiSelect>
              </Box>
            </Box>
            <Box>
              <Button variant="contained" onClick={handleApplyMapping} sx={{ mr: 1 }}>
                {t("userTag.columnMapping.applyMapping")}
              </Button>
              <Button variant="outlined" onClick={() => setShowColumnMapping(false)}>
                {t("common.cancel")}
              </Button>
            </Box>
          </Stack>
        </Paper>
      )}

      {(validationSummary.length > 0 || showSecretError) && (
        <Alert severity="error">
          <Stack>
            {showSecretError && <Typography variant="body2">{t("userTag.secretRequired")}</Typography>}
            {validationSummary.map((entry) => {
              const [messageKey, rowNumber] = entry.split(":");
              return (
                <Typography key={entry} variant="body2">
                  {rowNumber
                    ? t("userTag.grid.validationRow", { row: Number(rowNumber), message: t(messageKey) })
                    : t(messageKey)}
                </Typography>
              );
            })}
          </Stack>
        </Alert>
      )}

      {nonEmptyRowCount > 0 && (
        <Alert severity={errors.tags ? "warning" : "info"}>
          {t("userTag.willCreate", { nTags: nonEmptyRowCount })}
        </Alert>
      )}
    </>
  );
};

export const UserTagsCreate: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const navigate = useNavigate();
  const [createUserTags] = useCreateUserTagsMutation();
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const handleSubmit = (userTags: NewUserTags, { setSubmitting }: FormikHelpers<NewUserTags>) => {
    setSubmitting(true);
    setSubmitError(null);

    createUserTags({
      nodeId: currentNode.id,
      newUserTags: buildCreateUserTagsPayload(userTags),
    })
      .unwrap()
      .then(() => {
        setSubmitting(false);
        navigate(`${UserTagRoutes.list()}?createAccounts=true`);
      })
      .catch((err) => {
        const errorMessage =
          (typeof err === "object" &&
            err !== null &&
            "data" in err &&
            typeof err.data === "object" &&
            err.data !== null &&
            "detail" in err.data &&
            typeof err.data.detail === "string" &&
            err.data.detail) ||
          (typeof err === "object" &&
            err !== null &&
            "error" in err &&
            typeof err.error === "string" &&
            err.error) ||
          t("userTag.createFailed");

        setSubmitting(false);
        setSubmitError(errorMessage);
        toast.error(errorMessage);
      });
  };

  return (
    <Stack spacing={2}>
      <Grid container spacing={1}>
        <Grid display="flex" alignItems="center">
          <IconButton onClick={() => navigate(-1)}>
            <ChevronLeft />
          </IconButton>
          <Typography component="div" variant="h5">
            {t("userTag.create")}
          </Typography>
        </Grid>
      </Grid>
      <Formik
        initialValues={initialValues}
        validationSchema={toFormikValidationSchema(NewUserTagsSchema)}
        onSubmit={handleSubmit}
      >
        {(formik) => (
          <Form onSubmit={formik.handleSubmit}>
            <Stack spacing={2}>
              <Paper sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <UserTagsCreateForm {...formik} />
                </Stack>
                {formik.isSubmitting && <LinearProgress />}
              </Paper>
              {submitError && <Alert severity="error">{submitError}</Alert>}
              <Button type="submit" fullWidth variant="contained" color="primary" disabled={formik.isSubmitting}>
                {t("add")}
              </Button>
            </Stack>
          </Form>
        )}
      </Formik>
    </Stack>
  );
};
