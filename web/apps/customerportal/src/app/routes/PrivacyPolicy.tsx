import { usePublicConfig } from "@/hooks/usePublicConfig";
import { Link } from "@mui/material";
import { PageContainer } from "@/components";
import { Box } from "@mui/system";
import { Trans, useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const PrivacyPolicy: React.FC = () => {
  const config = usePublicConfig();
  const { i18n } = useTranslation();

  const privacyPolicyContent = config.translation_texts[i18n.language]?.["privacy_policy"] ?? "";
  const hasAgb = !!config.translation_texts[i18n.language]?.["agb"];

  return (
    <PageContainer title="Datenschutzerklärung">
      {hasAgb && (
        <Box sx={{ width: "100%", mb: 3, textAlign: "center" }}>
          <Trans i18nKey="privacyPolicyHeader">
            Link zu den
            <Link component={RouterLink} to="/agb" sx={{ fontWeight: "bold", ml: 0.5 }}>
              AGB
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
          "& strong": {
            fontWeight: 600,
          },
          "& a": {
            color: "primary.main",
            textDecoration: "underline",
          },
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{privacyPolicyContent}</ReactMarkdown>
      </Box>
    </PageContainer>
  );
};
