import { CircularProgress, Grid } from "@mui/material";
import * as React from "react";

export const Loading: React.FC = () => {
  return (
    <Grid
      container
      sx={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        width: "100%",
      }}
    >
      <CircularProgress />
    </Grid>
  );
};
