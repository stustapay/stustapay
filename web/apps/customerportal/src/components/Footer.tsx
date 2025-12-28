import * as React from "react";
import { useAppSelector, selectIsAuthenticated } from "@/store";
import { Box, Link, useTheme } from "@mui/material";
import { LoggedInFooter } from "./LoggedInFooter";
import { LoggedOutFooter } from "./LoggedOutFooter";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

export const Footer = () => {
  const theme = useTheme();
  const authenticated = useAppSelector(selectIsAuthenticated);
  const { t, i18n } = useTranslation();
  const config = usePublicConfig();

  const hasPrivacyPolicy = !!config.translation_texts[i18n.language]?.["privacy_policy"];
  const hasImpressum = !!config.translation_texts[i18n.language]?.["impressum"];

  return (
    <Box
      component="footer"
      className="glass-card"
      sx={{
        py: 3,
        px: { xs: 2, sm: 4 },
        mt: "auto", // Push footer to bottom
        background: "var(--glass-bg)",
        backdropFilter: "blur(10px)",
        borderTop: "var(--border-glass)",
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        color: "text.primary",
        gap: { xs: 1, sm: 2 },
      }}
    >
      <Link href={config.about_page_url} target="_blank" color="inherit" underline="hover">
        {t("about")}
      </Link>
      {authenticated ? <LoggedInFooter /> : <LoggedOutFooter />}
      <Link sx={{ ml: { xs: 0, sm: 4 } }} component={RouterLink} to="/faq" color="inherit" underline="hover">
        {t("nav.faq")}
      </Link>
      <Link sx={{ ml: { xs: 0, sm: 4 } }} component={RouterLink} to="/agb" color="inherit" underline="hover">
        {t("nav.agb")}
      </Link>
      {hasPrivacyPolicy && (
        <Link sx={{ ml: { xs: 0, sm: 4 } }} component={RouterLink} to="/datenschutz" color="inherit" underline="hover">
          {t("nav.privacyPolicy")}
        </Link>
      )}
      {hasImpressum && (
        <Link sx={{ ml: { xs: 0, sm: 4 } }} component={RouterLink} to="/impressum" color="inherit" underline="hover">
          {t("nav.impressum")}
        </Link>
      )}
      <Link sx={{ ml: { xs: 0, sm: 4 } }} href="https://github.com/TomTel85/stustapay" target="_blank" color="inherit" underline="hover">
        Github
      </Link>
    </Box>
  );
};
