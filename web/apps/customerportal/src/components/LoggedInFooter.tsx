import { useGetCustomerQuery } from "@/api";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import { Link } from "@mui/material";
import { formatUserTagUid } from "@stustapay/models";
import { useTranslation } from "react-i18next";

export const LoggedInFooter: React.FC = () => {
  const { data: customer, error: customerError, isLoading: isCustomerLoading } = useGetCustomerQuery();

  const config = usePublicConfig();
  const { t } = useTranslation();

  let subject = "Support request TeamFestlichPay";
  if (customer && !customerError && !isCustomerLoading) {
    subject = encodeURIComponent(`Support request TeamFestlichPay, tagUid: ${formatUserTagUid(customer.user_tag_uid_hex)}`);
  }

  const mailtoLink = `mailto:${config.contact_email}?subject=${subject}`;

  return (
    <Link href={mailtoLink} target="_blank" rel="noopener noreferrer">
      {t("contact")}
    </Link>
  );
};
