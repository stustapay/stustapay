import * as React from "react";
import { CircularProgress, Grid } from "@mui/material";

export const Loading: React.FC = () => {
  return (
    <Grid container direction="row" justifyContent="center" alignItems="center" sx={{ height: "100%", width: "100%" }}>
      <CircularProgress />
    </Grid>
  );
};
