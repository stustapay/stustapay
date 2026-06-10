import * as React from "react";
import { CircularProgress, Grid } from "@mui/material";

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
