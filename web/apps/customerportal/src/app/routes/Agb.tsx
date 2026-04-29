import { Link } from "@mui/material";
import { PageContainer } from "@/components";
import { Box } from "@mui/system";
import { Trans, useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Agb = () => {
  const config = usePublicConfig();
  const { i18n } = useTranslation();

  const agbContent = config.translation_texts[i18n.language]?.["agb"] ?? "";
  const hasPrivacyPolicy = !!config.translation_texts[i18n.language]?.["privacy_policy"];

  return (
    <PageContainer title="AGB">
      {hasPrivacyPolicy && (
        <Box sx={{ width: "100%", mb: 3, textAlign: "center" }}>
          <Trans i18nKey="termsAndConditionsHeader">
            Link to
            <Link component={RouterLink} to="/datenschutz" sx={{ fontWeight: "bold", ml: 0.5 }}>
              privacy policy
            </Link>
            .
          </Trans>
        </Box>
      )}
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
          "& ul, & ol": {
            marginBottom: 2,
            paddingLeft: 3,
          },
          "& li": {
            marginBottom: 0.5,
          },
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{agbContent}</ReactMarkdown>
      </Box>
    </PageContainer>
  );
};
