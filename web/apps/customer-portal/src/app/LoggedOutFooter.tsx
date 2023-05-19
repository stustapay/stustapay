import { usePublicConfig } from "@/hooks/usePublicConfig";
import { Link, Theme } from "@mui/material";
import { useTranslation } from "react-i18next";

interface LoggedOutFooterProps {
  theme: Theme;
}

export const LoggedOutFooter: React.FC<LoggedOutFooterProps> = ({ theme }) => {
  const config = usePublicConfig();
  const { t } = useTranslation();
  const subject = "Support request: ";
  const mailtoLink = `mailto:${config.contact_email}?subject=${subject}`;

  return (
    <Link sx={{ ml: 2 }} href={mailtoLink} target="_blank" rel="noopener noreferrer">
      {t("contact")}
    </Link>
  );
};
