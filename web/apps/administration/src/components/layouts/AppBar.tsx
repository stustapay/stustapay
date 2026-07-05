import { AppBar as MuiAppBar, AppBarProps as MuiAppBarProps } from "@mui/material";
import { styled } from "@mui/material/styles";

import { drawerWidth } from "./constants";

export interface AppBarProps extends MuiAppBarProps {
  open?: boolean;
  isDesktop?: boolean;
}

export const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open" && prop !== "isDesktop",
})<AppBarProps>(({ theme, open, isDesktop }) => ({
  transition: theme.transitions.create(["margin", "width"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open &&
    isDesktop && {
      width: `calc(100% - ${drawerWidth}px)`,
      marginLeft: `${drawerWidth}px`,
      transition: theme.transitions.create(["margin", "width"], {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
}));
