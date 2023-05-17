import { useGetCustomerQuery } from "@/api/customerApi";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import { Link, Theme } from "@mui/material";
import { formatUserTagUid } from "@stustapay/models";
import { useTranslation } from "react-i18next";

interface LoggedInFooterProps {
  theme: Theme;
}

export const LoggedInFooter: React.FC<LoggedInFooterProps> = ({ theme }) => {
  const { data: customer, error: customerError, isLoading: isCustomerLoading } = useGetCustomerQuery();

  const config = usePublicConfig();
  const { t } = useTranslation();

  let subject = "Support request StuStaPay";
  if (customer && !customerError && !isCustomerLoading) {
    subject = encodeURIComponent(`Support request StuStaPay, tagUID: ${formatUserTagUid(customer.user_tag_uid)}`);
  }

  const mailtoLink = `mailto:${config.contact_email}?subject=${subject}`;

  return (
    <Link sx={{ ml: 2 }} href={mailtoLink} target="_blank" rel="noopener noreferrer">
      {t("contact")}
    </Link>
  );
};
