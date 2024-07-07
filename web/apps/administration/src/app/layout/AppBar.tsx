import * as React from "react";
import { Logout, AppBar as RaAppBar, UserMenu, useUserMenu } from "react-admin";
import { MenuItem, ListItemIcon, ListItemText, MenuItemProps } from "@mui/material";
import { Person as PersonIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";

const ProfileMenuItem = React.forwardRef<HTMLLIElement, MenuItemProps>((props, ref) => {
  const { t } = useTranslation();
  const userMenuCtx = useUserMenu();

  return (
    <MenuItem onClick={userMenuCtx?.onClose} ref={ref} {...props}>
      <ListItemIcon>
        <PersonIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>{t("auth.profile")}</ListItemText>
    </MenuItem>
  );
});

export const AppBar = () => (
  <RaAppBar
    userMenu={
      <UserMenu>
        <ProfileMenuItem />
        <Logout />
      </UserMenu>
    }
  />
);
