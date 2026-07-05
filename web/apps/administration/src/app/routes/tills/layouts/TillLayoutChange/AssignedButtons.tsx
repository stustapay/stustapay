import { Box, Typography } from "@mui/material";
import * as React from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";

import { AssignedButtonsList } from "./AssignedButtonsList";
import { LayoutEditorDragItem, LayoutEditorItemType } from "./dnd";
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
  const emptyAssignedDropRef = React.useRef<HTMLDivElement>(null);

  const assignedSelectables = assignedButtonIds
    .map((id) => selectables.find((selectable) => selectable.id === id))
    .filter((selectable): selectable is Selectable => selectable != null);

  const assignedButtonIdsRef = React.useRef(assignedButtonIds);
  assignedButtonIdsRef.current = assignedButtonIds;

  const placeItem = React.useCallback(
    (item: LayoutEditorDragItem, hoveredItemId: number, hoveredBelow: boolean) => {
      const currentIds = assignedButtonIdsRef.current;
      const addMode = hoveredBelow ? 1 : 0;
      const oldHoveredIndex = currentIds.findIndex((id) => id === hoveredItemId);
      const oldIndex = currentIds.findIndex((id) => id === item.id);
      if (oldIndex === oldHoveredIndex + addMode) {
        return;
      }
      const newIds = currentIds.filter((id) => id !== item.id);
      const hoveredIndex = newIds.findIndex((id) => id === hoveredItemId);
      if (hoveredIndex === -1) {
        return;
      }
      newIds.splice(hoveredIndex + addMode, 0, item.id);
      setAssignedButtonIds(newIds);
    },
    [setAssignedButtonIds]
  );

  const [{ isOverEmptyAssigned, canDropEmptyAssigned }, dropEmptyAssigned] = useDrop<
    LayoutEditorDragItem,
    void,
    { isOverEmptyAssigned: boolean; canDropEmptyAssigned: boolean }
  >({
    accept: LayoutEditorItemType,
    canDrop: (item) => item.source === "available" && assignedButtonIdsRef.current.length === 0,
    drop: (item) => {
      if (item.source !== "available" || assignedButtonIdsRef.current.includes(item.id)) {
        return;
      }

      setAssignedButtonIds([...assignedButtonIdsRef.current, item.id]);
    },
    collect: (monitor) => ({
      isOverEmptyAssigned: monitor.isOver(),
      canDropEmptyAssigned: monitor.canDrop(),
    }),
  });

  dropEmptyAssigned(emptyAssignedDropRef);
  const highlightEmptyAssigned = isOverEmptyAssigned && canDropEmptyAssigned;

  const moveUp = (index: number) => {
    if (index <= 0) {
      return;
    }
    const newIds = [...assignedButtonIds];
    [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
    setAssignedButtonIds(newIds);
  };

  const moveDown = (index: number) => {
    if (index >= assignedButtonIds.length - 1) {
      return;
    }
    const newIds = [...assignedButtonIds];
    [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
    setAssignedButtonIds(newIds);
  };

  const remove = (id: number) => {
    setAssignedButtonIds(assignedButtonIds.filter((assignedId) => assignedId !== id));
  };

  return (
    <>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        {t("button.assignedButtons")}
      </Typography>
      {assignedSelectables.length === 0 ? (
        <Box
          ref={emptyAssignedDropRef}
          sx={{
            minHeight: "200px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: 2,
            borderStyle: "dashed",
            borderColor: highlightEmptyAssigned ? "primary.main" : "divider",
            borderRadius: 1,
            bgcolor: highlightEmptyAssigned ? "action.hover" : "background.paper",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {t("button.noAssignedButtons")}
          </Typography>
        </Box>
      ) : (
        <AssignedButtonsList
          assignedSelectables={assignedSelectables}
          placeItem={placeItem}
          onMoveUp={moveUp}
          onMoveDown={moveDown}
          onRemove={remove}
        />
      )}
    </>
  );
};
