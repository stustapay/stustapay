import { useGetConfigEntriesQuery } from "@api";
import { Loading } from "@components/Loading";
import { List, ListItem, ListItemText, Paper, Typography } from "@mui/material";
import { Box } from "@mui/system";
import * as React from "react";
import { useTranslation } from "react-i18next";

const ServerSideSettings: React.FC = () => {
  const { t } = useTranslation(["settings"]);
  const { data: configEntries } = useGetConfigEntriesQuery();

  if (!configEntries) {
    return <Loading />;
  }

  return (
    <Paper>
      <Box sx={{ p: 2 }}>
        <Typography variant="h5">{t("serverSideConfig")}</Typography>
      </Box>
      <List>
        {configEntries.map((entry) => (
          <ListItem>
            <ListItemText primary={t(entry.key)} secondary={entry.value} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export const Settings: React.FC = () => {
  const { t } = useTranslation(["settings"]);

  return (
    <>
      <Paper sx={{ mb: 2 }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h5">{t("localConfig")}</Typography>
        </Box>
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
      <ServerSideSettings />
    </>
  );
};
