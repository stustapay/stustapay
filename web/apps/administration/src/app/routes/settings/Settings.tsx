import { useGetConfigEntriesQuery, useSetConfigEntryMutation, selectConfigEntryAll } from "@api";
import { EditableListItem } from "@components";
import { Loading } from "@stustapay/components";
import { List, ListItem, ListItemText, Paper, Typography } from "@mui/material";
import { Box } from "@mui/system";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

const ServerSideSettings: React.FC = () => {
  const { t } = useTranslation(["settings"]);
  const { data: configEntries } = useGetConfigEntriesQuery();
  const [updateConfigEntry] = useSetConfigEntryMutation();

  if (!configEntries) {
    return <Loading />;
  }

  const changeConfigEntry = (key: string, value: string) => {
    updateConfigEntry({ key, value })
      .unwrap()
      .catch((err) => {
        toast.error(t("settingsUpdateError", { what: err.error }));
      });
  };

  return (
    <Paper>
      <Box sx={{ p: 2 }}>
        <Typography variant="h5">{t("serverSideConfig")}</Typography>
      </Box>
      <List>
        {selectConfigEntryAll(configEntries).map((entry) => (
          <EditableListItem
            key={entry.key}
            label={t(entry.key)}
            value={entry.value ?? ""}
            onChange={(value) => {
              changeConfigEntry(entry.key, value);
            }}
          />
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
        </List>
      </Paper>
      <ServerSideSettings />
    </>
  );
};
