import { Box, Stack, TextField, Typography } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export interface MarkdownEditorProps {
  value: string;
  label: string;
  onChange: (value: string) => void;
  showPreview?: boolean;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ label, value, onChange, showPreview = true }) => {
  const { t } = useTranslation();

  return (
    <Box display="grid" gridTemplateColumns={showPreview ? "repeat(2, 1fr)" : "auto"} gap={2} width="100%">
      <Stack>
        <Typography variant="body1">{label}</Typography>
        <TextField multiline fullWidth value={value} onChange={(evt) => onChange(evt.target.value)} minRows={10} />
      </Stack>
      {showPreview && (
        <Box display="grid" gridTemplateRows="min-content auto">
          <Typography variant="body1">{t("preview")}</Typography>
          <Box border={1} borderColor="divider" padding={1}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          </Box>
        </Box>
      )}
    </Box>
  );
};
