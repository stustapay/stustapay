import { Alert, AlertTitle, List, ListItem, ListItemText, Paper, Stack, Typography } from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";
import { PasswordChange } from "./PasswordChange";
import { selectCurrentUser, useAppSelector } from "@store";

export const Profile: React.FC = () => {
  const { t } = useTranslation();
  const currentUser = useAppSelector(selectCurrentUser);

  if (!currentUser) {
    return (
      <Alert severity="error">
        <AlertTitle>Error loading current user</AlertTitle>
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">{t("auth.profile")}</Typography>
        <List>
          <ListItem>
            <ListItemText primary={t("user.login")} secondary={currentUser.login} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("user.displayName")} secondary={currentUser.display_name} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("user.description")} secondary={currentUser.description} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("user.roles")} secondary={currentUser.role_names?.join(", ")} />
          </ListItem>
        </List>
      </Paper>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">{t("auth.changePassword")}</Typography>
        <PasswordChange />
      </Paper>
    </Stack>
  );
};
