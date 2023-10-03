import { selectConfigEntryAll, useListConfigEntriesQuery, useSetConfigEntryMutation } from "@/api";
import { EditableListItem } from "@/components";
import { List, Paper, Stack, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

export const SettingsLegacy: React.FC = () => {
  const { t } = useTranslation();
  const { data: configEntries } = useListConfigEntriesQuery();
  const [updateConfigEntry] = useSetConfigEntryMutation();

  if (!configEntries) {
    return <Loading />;
  }

  const changeConfigEntry = (key: string, value: string) => {
    updateConfigEntry({ configEntry: { key, value } })
      .unwrap()
      .catch((err) => {
        toast.error(t("settings.settingsUpdateError", { what: err.error }));
      });
  };

  return (
    <Stack spacing={2}>
      <Paper>
        <Box sx={{ p: 2 }}>
          <Typography variant="h5">{t("settings.serverSideConfig")}</Typography>
        </Box>
        <List>
          {selectConfigEntryAll(configEntries).map((entry) => (
            <EditableListItem
              key={entry.key}
              label={t(entry.key as any)}
              value={entry.value ?? ""}
              onChange={(value) => {
                changeConfigEntry(entry.key, value);
              }}
            />
          ))}
        </List>
      </Paper>
    </Stack>
  );
};
