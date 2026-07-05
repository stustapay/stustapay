import { styled } from "@mui/material/styles";

import { drawerWidth } from "./constants";

export const Main = styled("main", {
  shouldForwardProp: (prop) => prop !== "open" && prop !== "isDesktop",
})<{
  open?: boolean;
  isDesktop?: boolean;
}>(({ theme, open, isDesktop }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  ...(isDesktop && {
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: open ? 0 : `-${drawerWidth}px`,
    ...(open && {
      transition: theme.transitions.create("margin", {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
  }),
}));
