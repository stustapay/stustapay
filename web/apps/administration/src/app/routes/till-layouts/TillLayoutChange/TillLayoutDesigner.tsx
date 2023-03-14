import * as React from "react";
import { Grid } from "@mui/material";
import { AvailableButtons } from "./AvailableButtons";
import { AssignedButtons } from "./AssignedButtons";

export interface TillLayoutDesignerProps {
  buttonIds: number[];
  onChange: (buttonIds: number[]) => void;
}

export const TillLayoutDesigner: React.FC<TillLayoutDesignerProps> = ({ buttonIds, onChange }) => {
  const setAssignedButtonIds = React.useCallback(
    (newButtonIds: number[]) => {
      onChange(newButtonIds);
    },
    [onChange]
  );

  return (
    <Grid container sx={{ padding: 2 }}>
      <Grid item xs={6}>
        <AvailableButtons assignedButtonIds={buttonIds} setAssignedButtonIds={setAssignedButtonIds} />
      </Grid>
      <Grid item xs={6}>
        <AssignedButtons assignedButtonIds={buttonIds} setAssignedButtonIds={setAssignedButtonIds} />
      </Grid>
    </Grid>
  );
};
