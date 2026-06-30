import { ButtonProps } from "@mui/material";

export type LayoutAction = Pick<ButtonProps, "color" | "disabled"> & {
  icon?: React.ReactNode;
  label?: string;
  loading?: boolean;
  onClick: React.MouseEventHandler;
  hidden?: boolean;
};
