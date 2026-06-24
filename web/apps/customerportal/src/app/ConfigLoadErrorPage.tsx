import { MaintenancePage } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";

const TEAMFESTLICHPAY_LOGO_URL =
  "https://www.teamfestlichpay.de/fileadmin/user_upload/images/logos/logo_teamfestlichpay_tfpay.png";

export const ConfigLoadErrorPage: React.FC = () => {
  const { t } = useTranslation("translations", { keyPrefix: "errorPage" });
  return (
    <MaintenancePage
      brandName={t("brand")}
      title={t("maintenance")}
      message={t("currentlyUnavailable")}
      logoSrc={TEAMFESTLICHPAY_LOGO_URL}
    />
  );
};
