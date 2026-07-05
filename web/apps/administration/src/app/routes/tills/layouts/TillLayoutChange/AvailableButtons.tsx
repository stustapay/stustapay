import { Box, List, TextField, Typography } from "@mui/material";
import * as React from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";

import { LayoutEditorDragItem, LayoutEditorItemType } from "./dnd";
import { DraggableAvailableListItem } from "./DraggableAvailableListItem";
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
  const availableDropRef = React.useRef<HTMLDivElement>(null);
  const availableSelectables = React.useMemo(
    () =>
      selectables
        .filter(
          (selectable) =>
            !assignedButtonIds.includes(selectable.id) &&
            (!search || selectable.name.toLowerCase().includes(search.toLowerCase()))
        )
        .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())),
    [selectables, assignedButtonIds, search]
  );

  const assign = (id: number) => {
    setAssignedButtonIds([...assignedButtonIds, id]);
  };

  const [, drop] = useDrop<LayoutEditorDragItem>({
    accept: LayoutEditorItemType,
    canDrop: (item) => item.source === "assigned",
    drop: (item) => {
      if (item.source !== "assigned") {
        return;
      }

      setAssignedButtonIds(assignedButtonIds.filter((assignedId) => assignedId !== item.id));
    },
  });

  drop(availableDropRef);

  return (
    <Box ref={availableDropRef}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        {t("button.availableButtons")}
      </Typography>
      <TextField
        label={t("common.search")}
        fullWidth
        size="small"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 1 }}
      />
      {availableSelectables.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t("button.noAvailableButtons")}
        </Typography>
      ) : (
        <List dense disablePadding sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {availableSelectables.map((selectable) => (
            <DraggableAvailableListItem
              key={selectable.id}
              selectable={selectable}
              onAssign={() => assign(selectable.id)}
            />
          ))}
        </List>
      )}
    </Box>
  );
};
