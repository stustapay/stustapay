import { usePublicConfig } from "@/hooks/usePublicConfig";
import { Link } from "@mui/material";
import { useTranslation } from "react-i18next";

export const LoggedOutFooter: React.FC = () => {
  const config = usePublicConfig();
  const { t } = useTranslation();
  const subject = "Support request: ";
  const mailtoLink = `mailto:${config.contact_email}?subject=${subject}`;

  return (
    <Link href={mailtoLink} target="_blank" rel="noopener noreferrer">
      {t("contact")}
    </Link>
  );
};
