import { usePublicConfig } from "@/hooks/usePublicConfig";
import { Box, Link, Theme } from "@mui/material";
import { useTranslation } from "react-i18next";

interface LoggedOutFooterProps {
  theme: Theme;
}

export const LoggedOutFooter: React.FC<LoggedOutFooterProps> = ({ theme }) => {
  const config = usePublicConfig();
  const { t } = useTranslation();

  // links will be read out of the config
  const handleContactClick = () => {
    const subject = "Support request: ";

    const email = config.contact_email;

    const mailtoLink = `mailto:${email}?subject=${subject}`;

    const link = document.createElement("a");
    link.href = mailtoLink;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
  };

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
      <Link sx={{ mr: 2 }} href="https://www.stustaculum.de/?Impressum" target="_blank">
        {t("about")}
      </Link>
      <span>|</span>
      <Link sx={{ ml: 2 }} href="#" onClick={handleContactClick}>
        {t("contact")}
      </Link>
    </Box>
  );
};
