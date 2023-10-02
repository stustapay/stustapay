import * as React from "react";
import { List, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { DraggableButton } from "./DraggableButton";
import { DragArea } from "./DragArea";
import { TillButton } from "@stustapay/models";
import { Selectable } from "./types";

export interface AssignedButtonsProps {
  assignedButtonIds: number[];
  selectables: Selectable[];
  setAssignedButtonIds: (buttonIds: number[]) => void;
}

export const AssignedButtons: React.FC<AssignedButtonsProps> = ({
  assignedButtonIds,
  setAssignedButtonIds,
  selectables,
}) => {
  const { t } = useTranslation();
  const buttons = assignedButtonIds.map((id) => selectables.find((button) => button.id === id) as TillButton);

  const moveButton = (buttonId: number, hoveredButtonId: number, hoveredBelow: boolean) => {
    const addMode = hoveredBelow ? 1 : 0;
    // first check if the button would move at all
    const oldHoveredIndex = assignedButtonIds.findIndex((id) => id === hoveredButtonId);
    const oldIndex = assignedButtonIds.findIndex((id) => id === buttonId);
    if (oldIndex === oldHoveredIndex + addMode) {
      return;
    }
    const newButtons = [...assignedButtonIds.filter((id) => id !== buttonId)];
    const hoveredIndex = newButtons.findIndex((id) => id === hoveredButtonId);
    newButtons.splice(hoveredIndex + addMode, 0, buttonId);
    setAssignedButtonIds(newButtons);
  };

  if (assignedButtonIds.length === 0) {
    const moveButtonEmpty = (buttonId: number) => {
      setAssignedButtonIds([buttonId]);
    };
    return (
      <Typography variant="h5">
        {t("button.assignedButtons")}
        <DragArea moveButton={moveButtonEmpty} />
      </Typography>
    );
  }

  return (
    <>
      <Typography variant="h5">{t("button.assignedButtons")}</Typography>
      <List>
        {buttons.map((button) => (
          <DraggableButton key={button.id} button={button} moveButton={moveButton} />
        ))}
      </List>
    </>
  );
};
