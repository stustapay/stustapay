import { List, ListItem, ListItemText, Paper } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";

export const Settings: React.FC = () => {
  const { t } = useTranslation(["settings"]);

  return (
    <Paper>
      <List>
        <ListItem>
          <ListItemText primary={t("language")} secondary={"de"} />
        </ListItem>
        <ListItem>
          <ListItemText primary={t("currency")} secondary={"€"} />
        </ListItem>
        <ListItem>
          <ListItemText primary={t("juristiction")} secondary={"Germany"} />
        </ListItem>
      </List>
    </Paper>
  );
};
