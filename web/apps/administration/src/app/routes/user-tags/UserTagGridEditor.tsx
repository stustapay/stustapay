import {
  addEmptyUserTagGridRows,
  applyUserTagGridPaste,
  removeEmptyUserTagGridRows,
  type UserTagGridField,
  type UserTagGridIssue,
  type UserTagGridRow,
} from "./userTagGrid";
import { DeleteOutline } from "@mui/icons-material";
import {
  Button,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";

type UserTagGridEditorProps = {
  rows: UserTagGridRow[];
  issues: UserTagGridIssue[];
  onChange: (rows: UserTagGridRow[]) => void;
};

const FIELD_ORDER: UserTagGridField[] = ["pin", "uid", "is_vip", "comment", "group_tag"];

export const UserTagGridEditor: React.FC<UserTagGridEditorProps> = ({ rows, issues, onChange }) => {
  const { t } = useTranslation();
  const issueMap = React.useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((issue) => {
      if (issue.rowIndex == null || issue.field == null) {
        return;
      }

      const key = `${issue.rowIndex}:${issue.field}`;
      if (!map.has(key)) {
        map.set(key, issue.messageKey);
      }
    });
    return map;
  }, [issues]);

  const setFieldValue = (rowIndex: number, field: UserTagGridField, value: string) => {
    const nextRows = [...rows];
    nextRows[rowIndex] = {
      ...nextRows[rowIndex],
      [field]: value,
    };
    onChange(nextRows);
  };

  const handlePaste =
    (rowIndex: number, field: UserTagGridField) => (event: React.ClipboardEvent<HTMLInputElement>) => {
      const clipboardText = event.clipboardData.getData("text/plain");
      if (!clipboardText.includes("\n") && !clipboardText.includes("\t")) {
        return;
      }

      event.preventDefault();
      onChange(applyUserTagGridPaste(rows, rowIndex, field, clipboardText));
    };

  const removeRow = (rowIndex: number) => {
    const nextRows = rows.filter((_, index) => index !== rowIndex);
    onChange(nextRows.length > 0 ? nextRows : addEmptyUserTagGridRows([], 1));
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <Button variant="outlined" onClick={() => onChange(addEmptyUserTagGridRows(rows, 1))}>
          {t("userTag.grid.addRow")}
        </Button>
        <Button variant="outlined" onClick={() => onChange(addEmptyUserTagGridRows(rows, 10))}>
          {t("userTag.grid.addTenRows")}
        </Button>
        <Button variant="outlined" onClick={() => onChange(removeEmptyUserTagGridRows(rows))}>
          {t("userTag.grid.removeEmptyRows")}
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {t("userTag.grid.description")}
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t("userTag.pin")}</TableCell>
              <TableCell>{t("userTag.uid")}</TableCell>
              <TableCell>{t("userTag.vipStatus")}</TableCell>
              <TableCell>{t("userTag.comment")}</TableCell>
              <TableCell>{t("userTag.groupTag")}</TableCell>
              <TableCell width={72}>{t("common.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={row.id}>
                {FIELD_ORDER.map((field) => {
                  const errorKey = issueMap.get(`${rowIndex}:${field}`);
                  return (
                    <TableCell key={field} sx={{ verticalAlign: "top", minWidth: field === "comment" ? 240 : 160 }}>
                      <TextField
                        fullWidth
                        size="small"
                        value={row[field]}
                        onChange={(event) => setFieldValue(rowIndex, field, event.target.value)}
                        onPaste={handlePaste(rowIndex, field)}
                        error={Boolean(errorKey)}
                        helperText={errorKey ? t(errorKey) : " "}
                        placeholder={field === "is_vip" ? t("userTag.grid.vipPlaceholder") : undefined}
                        inputProps={{
                          "data-testid": `user-tag-grid-${field}-${rowIndex}`,
                        }}
                      />
                    </TableCell>
                  );
                })}
                <TableCell sx={{ verticalAlign: "top" }}>
                  <IconButton
                    aria-label={t("common.delete")}
                    onClick={() => removeRow(rowIndex)}
                    size="small"
                    data-testid={`user-tag-grid-delete-${rowIndex}`}
                  >
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
};
