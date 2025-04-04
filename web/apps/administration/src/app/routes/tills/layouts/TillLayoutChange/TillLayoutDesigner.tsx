import * as React from "react";
import { Grid } from "@mui/material";
import { AvailableButtons } from "./AvailableButtons";
import { AssignedButtons } from "./AssignedButtons";
import { Selectable } from "./types";

export interface TillLayoutDesignerProps {
  selectedIds: number[];
  onChange: (selectedIds: number[]) => void;
  selectables: Selectable[];
}

export const TillLayoutDesigner: React.FC<TillLayoutDesignerProps> = ({ selectedIds, onChange, selectables }) => {
  const setAssignedButtonIds = React.useCallback(
    (newButtonIds: number[]) => {
      onChange(newButtonIds);
    },
    [onChange]
  );

  return (
    <Grid container sx={{ padding: 2 }}>
      <Grid size={{ xs: 6 }}>
        <AvailableButtons
          assignedButtonIds={selectedIds}
          setAssignedButtonIds={setAssignedButtonIds}
          selectables={selectables}
        />
      </Grid>
      <Grid size={{ xs: 6 }}>
        <AssignedButtons
          assignedButtonIds={selectedIds}
          setAssignedButtonIds={setAssignedButtonIds}
          selectables={selectables}
        />
      </Grid>
    </Grid>
  );
};
