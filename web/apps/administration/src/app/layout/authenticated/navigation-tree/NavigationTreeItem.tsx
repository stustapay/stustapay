import { TreeItem, TreeItemProps } from "@mui/x-tree-view";
import * as React from "react";
import { Box, SvgIconProps, Typography, useTheme } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

declare module "react" {
  interface CSSProperties {
    "--tree-view-color"?: string;
    "--tree-view-bg-color"?: string;
  }
}

export interface NavigationTreeItemProps extends TreeItemProps {
  to?: string;
  bgColor?: string;
  bgColorForDarkMode?: string;
  color?: string;
  colorForDarkMode?: string;
  labelIcon: React.ElementType<SvgIconProps>;
  labelInfo?: string;
  labelText: string;
  suffixIcon?: React.ElementType<SvgIconProps>;
}

export const NavigationTreeItem: React.FC<NavigationTreeItemProps> = React.memo((props) => {
  const theme = useTheme();
  const {
    to,
    bgColor,
    color,
    labelIcon: LabelIcon,
    labelInfo,
    labelText,
    colorForDarkMode,
    bgColorForDarkMode,
    suffixIcon: SuffixIcon,
    ...other
  } = props;

  const styleProps = {
    "--tree-view-color": theme.palette.mode !== "dark" ? color : colorForDarkMode,
    "--tree-view-bg-color": theme.palette.mode !== "dark" ? bgColor : bgColorForDarkMode,
  };

  return (
    <TreeItem
      label={
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            p: 0.5,
            pr: 0,
            height: "1.4em",
            textDecoration: "none",
            color: theme.palette.text.secondary,
          }}
          component={to ? (RouterLink as any) : undefined}
          to={to}
        >
          <Box component={LabelIcon} color="inherit" sx={{ mr: 1 }} />
          <Typography variant="body2" sx={{ fontWeight: "inherit", flexGrow: 1 }}>
            {labelText}
          </Typography>
          <Typography variant="caption" color="inherit">
            {labelInfo}
          </Typography>
          {SuffixIcon && <Box component={SuffixIcon} color="inherit" sx={{ mr: 1 }} />}
        </Box>
      }
      style={styleProps}
      {...other}
    />
  );
});
