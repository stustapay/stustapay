import * as React from "react";
import {
  UserTagSecret,
  useCreateUserTagsMutation,
  useListUserTagSecretsQuery,
} from "@/api";
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
  MenuItem,
  Paper,
  Stack,
  Select as MuiSelect,
  SelectChangeEvent,
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

// Column name variations for auto-detection
const COLUMN_VARIANTS: Record<string, string[]> = {
  pin: ["pin", "PIN", "tag_pin", "Tag Pin", "tagPin", "tag-pin", "tag pin"],
  uid: ["uid", "UID", "tag_uid", "Tag UID", "tagUid", "tag-uid", "tag uid", "id", "ID", "tag_id", "Tag ID"],
  is_vip: ["is_vip", "isVip", "vip", "VIP", "is-vip", "is vip"],
  comment: ["comment", "Comment", "comments", "notes", "note", "Notes", "Note"],
  group_tag: ["group_tag", "groupTag", "group-tag", "group", "Group Tag", "group tag"],
};

// Parse UID string, handling both decimal and hex formats
function parseUid(uidString: string | undefined): number | undefined {
  if (!uidString) return undefined;
  const trimmed = uidString.trim();
  // Check if it's hex (starts with 0x or contains only hex chars)
  if (trimmed.startsWith("0x") || trimmed.startsWith("0X")) {
    return parseInt(trimmed, 16);
  }
  // Check if it's all hex digits (without 0x prefix) - but not pure decimal
  if (/^[0-9A-Fa-f]+$/.test(trimmed) && !/^\d+$/.test(trimmed)) {
    return parseInt(trimmed, 16);
  }
  // Otherwise parse as decimal
  const parsed = Number(trimmed);
  return isNaN(parsed) ? undefined : parsed;
}

// Auto-detect delimiter by trying common ones
function detectDelimiter(csvContent: string): string {
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
}

// Auto-detect column mapping
function detectColumnMapping(headers: string[]): ColumnMapping {
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
      if (mapping[fieldKey]) break;
    }
  }

  return mapping;
}

type ColumnMapping = {
  pin: string | null;
  uid: string | null;
  is_vip: string | null;
  comment: string | null;
  group_tag: string | null;
};

const parseCsv = (
  csvContent: string,
  columnMapping: ColumnMapping
): Array<{ pin: string; uid?: number; is_vip?: boolean; comment?: string; group_tag?: string }> | null => {
  // Auto-detect delimiter
  const delimiter = detectDelimiter(csvContent);

  const parsed = Papa.parse<Record<string, string>>(csvContent, {
    delimiter: delimiter || "",
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors.length > 0) {
    const nonCriticalErrors = parsed.errors.filter((e) => e.code !== "MissingQuotes");
    if (nonCriticalErrors.length > 0) {
      toast.error(`There was an error in the csv file: ${nonCriticalErrors.map((e) => e.message).join(", ")}`);
      return null;
    }
  }

  if (!parsed.meta.fields || parsed.meta.fields.length === 0) {
    toast.error("CSV file appears to have no headers");
    return null;
  }

  // Check that pin column is mapped
  if (!columnMapping.pin) {
    toast.error("PIN column must be mapped");
    return null;
  }

  // Process the data using the column mapping
  const processedData = parsed.data.map((item) => {
    const pin = columnMapping.pin ? item[columnMapping.pin]?.trim() : "";
    const uidStr = columnMapping.uid ? item[columnMapping.uid]?.trim() : undefined;
    const isVipStr = columnMapping.is_vip ? item[columnMapping.is_vip]?.trim() : undefined;
    const comment = columnMapping.comment ? item[columnMapping.comment]?.trim() : undefined;
    const groupTag = columnMapping.group_tag ? item[columnMapping.group_tag]?.trim() : undefined;

    return {
      pin: pin || "",
      uid: parseUid(uidStr),
      is_vip: isVipStr ? isVipStr.toLowerCase() === "true" || isVipStr === "1" : undefined,
      comment: comment || undefined,
      group_tag: groupTag || undefined,
    };
  });

  const validated = CsvTagsSchema.safeParse(processedData);
  if (!validated.success) {
    toast.error(`There was an error in the csv file: ${validated.error.issues.map((i) => i.message).join(", ")}`);
    return null;
  }
  return validated.data;
};

const TagsForm: React.FC<FormikProps<NewUserTags>> = (props) => {
  const { currentNode } = useCurrentNode();
  const { t } = useTranslation();
  const { values, setFieldValue } = props;
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

      // Parse headers first
      const delimiter = detectDelimiter(res);
      const parsed = Papa.parse<Record<string, string>>(res, {
        delimiter: delimiter || "",
        header: true,
        skipEmptyLines: false,
        preview: 1,
        transformHeader: (header) => header.trim(),
      });

      if (!parsed.meta.fields || parsed.meta.fields.length === 0) {
        toast.error("CSV file appears to have no headers");
        return;
      }

      const headers = parsed.meta.fields;
      setCsvHeaders(headers);
      setCsvContent(res);

      // Auto-detect column mapping
      const detectedMapping = detectColumnMapping(headers);
      setColumnMapping(detectedMapping);
      setShowColumnMapping(true);
    };
    reader.readAsText(file);
  };

  const handleApplyMapping = () => {
    if (!csvContent) return;

    if (!columnMapping.pin) {
      toast.error(t("userTag.columnMapping.pinRequired"));
      return;
    }

    const tags = parseCsv(csvContent, columnMapping);
    if (tags) {
      setFieldValue("tags", tags);
      setShowColumnMapping(false);
      toast.success(t("userTag.columnMapping.mappingApplied"));
    }
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
        <VisuallyHiddenInput type="file" accept=".csv,.txt" onChange={(event) => handleCsvUpload(event)} />
      </Button>

      {showColumnMapping && csvHeaders.length > 0 && (
        <Paper sx={{ p: 2, mt: 2 }}>
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
                  onChange={(e: SelectChangeEvent<string>) =>
                    setColumnMapping({ ...columnMapping, pin: e.target.value || null })
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
                  onChange={(e: SelectChangeEvent<string>) =>
                    setColumnMapping({ ...columnMapping, uid: e.target.value || null })
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
                  onChange={(e: SelectChangeEvent<string>) =>
                    setColumnMapping({ ...columnMapping, is_vip: e.target.value || null })
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
                  onChange={(e: SelectChangeEvent<string>) =>
                    setColumnMapping({ ...columnMapping, comment: e.target.value || null })
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
                  onChange={(e: SelectChangeEvent<string>) =>
                    setColumnMapping({ ...columnMapping, group_tag: e.target.value || null })
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

  const handleSubmit = (userTags: NewUserTags) => {
    return createUserTags({
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
    });
  };

  return (
    <CreateLayout
      title={t("userTag.create")}
      submitLabel={t("add")}
      successRoute={`${UserTagRoutes.list()}?createAccounts=true`}
      initialValues={initialValues}
      validationSchema={NewUserTagsSchema}
      onSubmit={handleSubmit}
      form={TagsForm}
    />
  );
};
