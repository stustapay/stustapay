import translations from "@/assets/locales/en/translations";
import { Container, Typography } from "@mui/material";
import { Box } from "@mui/system";
import * as React from "react";
import { useTranslation } from "react-i18next";

const SingleQALayout = ({ translationPrefix }: { translationPrefix: string }) => {
  const { t } = useTranslation(undefined, { keyPrefix: "faq" });
  return (
    <Box
      sx={{
        borderTop: (theme) => `1px solid ${theme.palette.divider}`,
        width: "100%",
      }}
    >
      <Typography variant="h5" gutterBottom>
        {t(`${translationPrefix}.question` as any)}
      </Typography>

      <Typography
        variant="body1"
        sx={{
          textAlign: "justify",
        }}
        gutterBottom
      >
        {t(`${translationPrefix}.answer` as any)}
      </Typography>
    </Box>
  );
};

export const Faq: React.FC = () => {
  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Typography
          variant="h2"
          sx={{
            fontWeight: "bold",
          }}
          gutterBottom
        >
          FAQs
        </Typography>
        {Object.keys(translations.faq).map((key) => (
          <SingleQALayout translationPrefix={key} key={key} />
        ))}
      </Box>
    </Container>
  );
};
