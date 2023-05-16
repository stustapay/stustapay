import * as React from "react";
import { List, Typography } from "@mui/material";
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
  const buttons = selectables
    .filter((button) => !assignedButtonIds.includes(button.id))
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  const moveButton = (productId: number) => {
    setAssignedButtonIds(assignedButtonIds.filter((id) => id !== productId));
  };

  if (buttons.length === 0) {
    const moveButtonEmpty = (productId: number) => {
      setAssignedButtonIds(assignedButtonIds.filter((id) => id !== productId));
    };
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
        {buttons.map((button) => (
          <DraggableButton key={button.id} button={button} moveButton={moveButton} />
        ))}
      </List>
    </>
  );
};
