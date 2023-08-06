import { selectTheme, Theme, useAppDispatch, useAppSelector, setTheme } from "@store";
import { MenuItem, Select, SelectChangeEvent, SelectProps } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";

export type ThemeSelectProps = Omit<SelectProps, "value" | "onChange">;

export const ThemeSelect: React.FC<ThemeSelectProps> = (props) => {
  const { t } = useTranslation();
  const theme = useAppSelector(selectTheme);
  const dispatch = useAppDispatch();

  const handleSetTheme = (event: SelectChangeEvent<unknown>) => {
    dispatch(setTheme(event.target.value as Theme));
  };

  return (
    <Select value={theme} onChange={handleSetTheme} {...props}>
      <MenuItem value="browser">{t("settings.theme.browser")}</MenuItem>
      <MenuItem value="dark">{t("settings.theme.dark")}</MenuItem>
      <MenuItem value="light">{t("settings.theme.light")}</MenuItem>
    </Select>
  );
};
