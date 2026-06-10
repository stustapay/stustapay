import { Link } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { usePublicConfig } from "@/hooks/usePublicConfig";

export const LoggedOutFooter: React.FC = () => {
  const config = usePublicConfig();
  const { t } = useTranslation();
  const subject = "Support request: ";
  const mailtoLink = `mailto:${config.contact_email}?subject=${subject}`;

  return (
    <Link sx={{ ml: 4 }} href={mailtoLink} target="_blank" rel="noopener noreferrer">
      {t("contact")}
    </Link>
  );
};
