import { Container, Link } from "@mui/material";
import { Box } from "@mui/system";
import { Trans, useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const PrivacyPolicy = () => {
  const config = usePublicConfig();
  const { i18n } = useTranslation();

  const privacypolicyContent = config.translation_texts[i18n.language]?.["privacypolicy"] ?? "";

  return (
    <Container component="main" maxWidth="md">
      <Box sx={{ flexDirection: "column", alignItems: "center", width: "100%", textAlign: "justify" }}>
        <h1 id="stustapay-privacypolicy">StuStaPay Datenschutzerklärung</h1>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{privacypolicyContent}</ReactMarkdown>
      </Box>
    </Container>
  );
};
