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

  return (
    <Container component="main" maxWidth="md">
      <Box sx={{ flexDirection: "column", alignItems: "center", width: "100%", textAlign: "justify" }}>
        <Typography
          variant="h2"
          sx={{
            fontWeight: "bold",
          }}
          gutterBottom
        >
          Datenschutzerklärung
        </Typography>
        <p>
          <Trans i18nKey="privacyPolicyHeader">
            Link zu den
            <Link component={RouterLink} to="/agb">
              AGB
            </Link>
            .
          </Trans>
        </p>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{privacyPolicyContent}</ReactMarkdown>
      </Box>
    </Container>
  );
};
