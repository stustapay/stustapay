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

  console.log(i18n.language);
  const agbContent = config.translation_texts[i18n.language]?.["agb"] ?? "";

  return (
    <Container component="main" maxWidth="md">
      <Box sx={{ flexDirection: "column", alignItems: "center", width: "100%", textAlign: "justify" }}>
        <h1 id="stustapay-agb">StuStaPay AGB</h1>
        <p>
          <Trans i18nKey="termsAndConditionsHeader">
            Link to
            <Link component={RouterLink} to="/datenschutz">
              privacy policy
            </Link>
            .
          </Trans>
        </p>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{agbContent}</ReactMarkdown>
      </Box>
    </Container>
  );
};
