import { Language, RestrictedEventSettings } from "@/api";
import * as React from "react";
import { Select } from "@stustapay/components";
import { useTranslation } from "react-i18next";

export interface LanguageDropdownProps {
  value: Language;
  onChange: (value: Language) => void;
  eventSettings: RestrictedEventSettings;
}

export const LanguageDropdown: React.FC<LanguageDropdownProps> = ({ value, onChange, eventSettings }) => {
  const { t } = useTranslation();
  return (
    <Select
      label={t("settings.language")}
      multiple={false}
      value={value}
      onChange={(val) => (val != null ? onChange : null)}
      options={eventSettings.languages}
      formatOption={(option: Language) => option}
    />
  );
};
