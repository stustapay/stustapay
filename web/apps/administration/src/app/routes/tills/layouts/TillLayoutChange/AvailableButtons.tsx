import * as React from "react";
import { List, TextField, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { DraggableButton } from "./DraggableButton";
import { DragArea } from "./DragArea";
import { Selectable } from "./types";

export interface AvailableButtonsProps {
  assignedButtonIds: number[];
  selectables: Selectable[];
  setAssignedButtonIds: (productIds: number[]) => void;
}

export const AvailableButtons: React.FC<AvailableButtonsProps> = ({
  assignedButtonIds,
  setAssignedButtonIds,
  selectables,
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = React.useState("");
  const buttons = React.useMemo(
    () =>
      selectables
        .filter(
          (button) =>
            !assignedButtonIds.includes(button.id) &&
            (!search || button.name.toLowerCase().includes(search.toLowerCase()))
        )
        .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())),
    [selectables, assignedButtonIds, search]
  );

  const moveButton = (productId: number) => {
    setAssignedButtonIds(assignedButtonIds.filter((id) => id !== productId));
  };
  const moveButtonEmpty = (productId: number) => {
    setAssignedButtonIds(assignedButtonIds.filter((id) => id !== productId));
  };

  if (buttons.length === 0) {
    return (
      <Typography variant="h5">
        {t("button.availableButtons")}
        <DragArea moveButton={moveButtonEmpty} />
      </Typography>
    );
  }

  return (
    <>
      <Typography variant="h5">{t("button.availableButtons")}</Typography>
      <List>
        <TextField label="Search" fullWidth value={search} onChange={(e) => setSearch(e.target.value)} sx={{ mb: 2 }} />
        {buttons.map((button) => (
          <DraggableButton key={button.id} button={button} moveButton={moveButton} />
        ))}
      </List>
    </>
  );
};
