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
  const { t } = useTranslation();
  const config = usePublicConfig();

  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        px: 4,
        backgroundColor: theme.palette.background.default,
        borderTop: `1px solid ${theme.palette.divider}`,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: theme.palette.common.white,
      }}
    >
      <Link href={config.about_page_url} target="_blank">
        {t("about")}
      </Link>
      {authenticated ? <LoggedInFooter /> : <LoggedOutFooter />}
      <Link sx={{ ml: 4 }} component={RouterLink} to="/faq">
        {t("nav.faq")}
      </Link>
      <Link sx={{ ml: 4 }} component={RouterLink} to="/agb">
        {t("nav.agb")}
      </Link>
      <Link sx={{ ml: 4 }} component={RouterLink} to="/privacypolicy">
        {t("nav.privacypolicy")}
      </Link>
      <Link sx={{ ml: 4 }} href="https://github.com/stustapay/stustapay" target="_blank">
        Github
      </Link>
    </Box>
  );
};
