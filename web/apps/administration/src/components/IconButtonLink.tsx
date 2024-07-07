import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { IconButton, IconButtonProps } from "@mui/material";

type IconButtonLinkProps = {
  to: string;
} & Omit<IconButtonProps, "onClick">;

export const IconButtonLink: React.FC<IconButtonLinkProps> = ({ to, children, ...props }) => {
  const ref = React.useRef<HTMLLinkElement>(null);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const handler = (event: Event) => {
      event.stopPropagation();
    };

    element.addEventListener("click", handler);
    return () => {
      element.removeEventListener("click", handler);
    };
  }, [ref]);
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <IconButton component={RouterLink as any} to={to} {...props} ref={ref}>
      {children}
    </IconButton>
  );
};
