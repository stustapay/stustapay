import { usePublicConfig } from "@/hooks/usePublicConfig";
import { PageContainer } from "@/components";
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
    <PageContainer title="Impressum">
      <Box
        sx={{
          width: "100%",
          "& p": {
            marginBottom: 2,
            textAlign: "left",
            lineHeight: 1.6,
          },
          "& h1, & h2, & h3, & h4, & h5, & h6": {
            marginTop: 3,
            marginBottom: 1.5,
            textAlign: "left",
            fontWeight: 600,
          },
          "& strong": {
            display: "block",
            marginBottom: 0.5,
            fontSize: "1.1rem",
            fontWeight: 600,
          },
          "& a": {
            color: "primary.main",
            textDecoration: "underline",
          },
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{impressumContent}</ReactMarkdown>
      </Box>
    </PageContainer>
  );
}; 