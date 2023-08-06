import { ButtonProps } from "@mui/material";

export type LayoutAction = Pick<ButtonProps, "color" | "disabled"> & {
  icon: React.ReactNode;
  label?: string;
  onClick: React.MouseEventHandler;
  hidden?: boolean;
};