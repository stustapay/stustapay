import { usePublicConfig } from "@/hooks/usePublicConfig";
import { Container, Link, Typography } from "@mui/material";
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
    <Container component="main" maxWidth="md">
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
        <Typography
          variant="h2"
          sx={{
            fontWeight: "bold",
            mb: 3,
          }}
          gutterBottom
        >
          Datenschutzerklärung
        </Typography>
        {hasAgb && (
          <Box sx={{ width: "100%", mb: 2, textAlign: "left" }}>
            <Trans i18nKey="privacyPolicyHeader">
              Link zu den
              <Link component={RouterLink} to="/agb">
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
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{privacyPolicyContent}</ReactMarkdown>
        </Box>
      </Box>
    </Container>
  );
};
