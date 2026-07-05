import { FormControl, ListItemIcon, ListItemText, MenuItem, Select, Stack, Tab, Tabs } from "@mui/material";
import { SxProps, Theme, useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import * as React from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";

export interface PageTab {
  value: string;
  label: string;
  to: string;
  icon?: React.ReactElement;
}

export interface ResponsivePageTabsProps {
  value?: string;
  tabs: PageTab[];
  ariaLabel?: string;
  sx?: SxProps<Theme>;
}

const renderTabValue = (tab: PageTab) => (
  <Stack direction="row" spacing={0} sx={{ alignItems: "center" }}>
    {tab.icon && <ListItemIcon sx={{ minWidth: 36 }}>{tab.icon}</ListItemIcon>}
    <span>{tab.label}</span>
  </Stack>
);

const normalizePath = (path: string) => {
  const [pathWithoutQuery] = path.split(/[?#]/, 1);
  return pathWithoutQuery.replace(/\/+$/, "") || "/";
};

const pathMatchesTab = (pathname: string, tabPath: string) => {
  const normalizedPathname = normalizePath(pathname);
  const normalizedTabPath = normalizePath(tabPath);

  return normalizedPathname === normalizedTabPath || normalizedPathname.startsWith(`${normalizedTabPath}/`);
};

const getActiveTab = (pathname: string, tabs: PageTab[]) => {
  return tabs
    .filter((tab) => pathMatchesTab(pathname, tab.to))
    .toSorted((left, right) => normalizePath(right.to).length - normalizePath(left.to).length)[0];
};

export const ResponsivePageTabs: React.FC<ResponsivePageTabsProps> = ({ value, tabs, ariaLabel, sx }) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const navigate = useNavigate();
  const location = useLocation();
  const activeValue = value ?? getActiveTab(location.pathname, tabs)?.value ?? tabs[0]?.value ?? "";

  if (!isDesktop) {
    return (
      <FormControl fullWidth sx={{ mb: 1, ...sx }}>
        <Select
          value={activeValue}
          onChange={(event) => {
            const tab = tabs.find((item) => item.value === event.target.value);
            if (tab) {
              navigate(tab.to);
            }
          }}
          renderValue={(selected) => {
            const tab = tabs.find((item) => item.value === selected);
            return tab ? renderTabValue(tab) : selected;
          }}
          aria-label={ariaLabel}
        >
          {tabs.map((tab) => (
            <MenuItem key={tab.value} value={tab.value}>
              {tab.icon ? (
                <>
                  <ListItemIcon sx={{ minWidth: 36 }}>{tab.icon}</ListItemIcon>
                  <ListItemText>{tab.label}</ListItemText>
                </>
              ) : (
                tab.label
              )}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  return (
    <Tabs value={activeValue} sx={{ borderBottom: 1, borderColor: "divider", ...sx }} aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <Tab
          key={tab.value}
          label={tab.label}
          component={RouterLink}
          value={tab.value}
          to={tab.to}
          icon={tab.icon}
          iconPosition={tab.icon ? "start" : undefined}
        />
      ))}
    </Tabs>
  );
};
