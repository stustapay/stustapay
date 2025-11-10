import { usePublicConfig } from "@/hooks/usePublicConfig";
import { Container, Typography } from "@mui/material";
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
    <Container component="main" maxWidth="md">
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Typography
          variant="h2"
          sx={{
            fontWeight: "bold",
            mb: 3,
          }}
          gutterBottom
        >
          FAQs
        </Typography>
        <Box
          sx={{
            width: "100%",
            "& p": {
              marginBottom: 2,
              textAlign: "left",
            },
            "& h1, & h2, & h3, & h4, & h5, & h6": {
              marginTop: 3,
              marginBottom: 1.5,
              textAlign: "left",
            },
            "& ul, & ol": {
              marginBottom: 2,
              paddingLeft: 3,
            },
            "& strong": {
              fontWeight: 600,
            },
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{faqContent}</ReactMarkdown>
        </Box>
      </Box>
    </Container>
  );
};
