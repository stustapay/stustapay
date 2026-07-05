import { Grid } from "@mui/material";
import * as React from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import { AssignedButtons } from "./AssignedButtons";
import { AssignedLayoutDragLayer } from "./AssignedLayoutDragLayer";
import { AvailableButtons } from "./AvailableButtons";
import { Selectable } from "./types";

export interface TillLayoutDesignerProps {
  selectedIds: number[];
  onChange: (selectedIds: number[]) => void;
  selectables: Selectable[];
}

export const TillLayoutDesigner: React.FC<TillLayoutDesignerProps> = ({ selectedIds, onChange, selectables }) => {
  return (
    <DndProvider backend={HTML5Backend}>
      <AssignedLayoutDragLayer />
      <Grid container spacing={2} sx={{ p: 2 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <AvailableButtons assignedButtonIds={selectedIds} setAssignedButtonIds={onChange} selectables={selectables} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AssignedButtons assignedButtonIds={selectedIds} setAssignedButtonIds={onChange} selectables={selectables} />
        </Grid>
      </Grid>
    </DndProvider>
  );
};
