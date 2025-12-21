import { Container, Link } from "@mui/material";
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
    <Container component="main" maxWidth="md">
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
        <h1 id="stustapay-agb" style={{ marginBottom: "1.5rem" }}>
          TeamFestlichPay AGB
        </h1>
        {hasPrivacyPolicy && (
          <Box sx={{ width: "100%", mb: 2, textAlign: "left" }}>
            <Trans i18nKey="termsAndConditionsHeader">
              Link to
              <Link component={RouterLink} to="/datenschutz">
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
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{agbContent}</ReactMarkdown>
        </Box>
      </Box>
    </Container>
  );
};
