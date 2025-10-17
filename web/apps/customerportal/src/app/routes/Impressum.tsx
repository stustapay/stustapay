import { usePublicConfig } from "@/hooks/usePublicConfig";
import { Container, Typography } from "@mui/material";
import { Box } from "@mui/system";
import * as React from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Impressum: React.FC = () => {
  const config = usePublicConfig();
  const { i18n } = useTranslation();

  const impressumContent = config.translation_texts[i18n.language]?.["impressum"] ?? "";

  return (
    <Container component="main" maxWidth="md">
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Typography
          variant="h2"
          sx={{
            fontWeight: "bold",
          }}
          gutterBottom
        >
          Impressum
        </Typography>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{impressumContent}</ReactMarkdown>
      </Box>
    </Container>
  );
}; 