import { usePublicConfig } from "@/hooks/usePublicConfig";
import { PageContainer } from "@/components";
import { Box } from "@mui/system";
import * as React from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Faq: React.FC = () => {
  const config = usePublicConfig();
  const { i18n } = useTranslation();

  const faqContent = config.translation_texts[i18n.language]?.["faq"] ?? "";

  return (
    <PageContainer title="FAQs">
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
            color: "text.primary",
          },
          "& ul, & ol": {
            marginBottom: 2,
            paddingLeft: 3,
            lineHeight: 1.6,
          },
          "& a": {
            color: "primary.main",
            textDecoration: "underline",
          },
          "& strong": {
            fontWeight: 700,
            color: "text.primary",
          },
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{faqContent}</ReactMarkdown>
      </Box>
    </PageContainer>
  );
};
