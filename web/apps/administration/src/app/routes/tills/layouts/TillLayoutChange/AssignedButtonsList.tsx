import { List } from "@mui/material";
import * as React from "react";

import { LayoutEditorDragItem } from "./dnd";
import { DraggableAssignedListItem } from "./DraggableAssignedListItem";
import { Selectable } from "./types";

export interface AssignedButtonsListProps {
  assignedSelectables: Selectable[];
  placeItem: (item: LayoutEditorDragItem, hoveredItemId: number, hoveredBelow: boolean) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (id: number) => void;
}

export const AssignedButtonsList: React.FC<AssignedButtonsListProps> = ({
  assignedSelectables,
  placeItem,
  onMoveUp,
  onMoveDown,
  onRemove,
}) => {
  return (
    <List dense disablePadding sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {assignedSelectables.map((selectable, index) => (
        <DraggableAssignedListItem
          key={selectable.id}
          selectable={selectable}
          placeItem={placeItem}
          onMoveUp={() => onMoveUp(index)}
          onMoveDown={() => onMoveDown(index)}
          onRemove={() => onRemove(selectable.id)}
          disableMoveUp={index === 0}
          disableMoveDown={index === assignedSelectables.length - 1}
        />
      ))}
    </List>
  );
};
