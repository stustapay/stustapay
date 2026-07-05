import {
  ArrowDownward as ArrowDownwardIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowUpward as ArrowUpwardIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { Box, IconButton, IconButtonProps, ListItem, ListItemText, Stack, Theme } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { useCurrencyFormatter } from "@/hooks";

import { Selectable } from "./types";

export interface SelectableListItemProps {
  selectable: Selectable;
  variant: "available" | "assigned";
  onAssign?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove?: () => void;
  disableMoveUp?: boolean;
  disableMoveDown?: boolean;
  isDragPlaceholder?: boolean;
  dragHandleRef?: React.Ref<HTMLDivElement>;
}

export const selectableListSx = (
  theme: Theme,
  {
    variant,
    isDragPlaceholder,
    isDraggable,
  }: { variant: "available" | "assigned"; isDragPlaceholder: boolean; isDraggable?: boolean }
) => ({
  px: 2,
  py: 1,
  pr: variant === "assigned" ? 14 : 6,
  minHeight: variant === "assigned" && isDragPlaceholder ? 52 : undefined,
  border: isDragPlaceholder ? 2 : 1,
  borderStyle: isDragPlaceholder ? "dashed" : "solid",
  borderColor: isDragPlaceholder ? "primary.main" : "divider",
  borderRadius: 1,
  bgcolor: isDragPlaceholder ? "action.hover" : "background.paper",
  boxShadow: isDragPlaceholder ? "none" : theme.shadows[1],
  opacity: 1,
  cursor: isDraggable ? undefined : variant === "assigned" ? (isDragPlaceholder ? "grabbing" : "grab") : "pointer",
  transition: theme.transitions.create(["box-shadow", "border-color", "background-color"], {
    duration: theme.transitions.duration.short,
  }),
  ...(isDragPlaceholder && {
    "& .MuiListItemText-root, & .MuiStack-root, & .MuiBox-root, & .MuiIconButton-root": {
      visibility: "hidden",
    },
  }),
});

const preventDragStart = (event: React.MouseEvent) => {
  event.stopPropagation();
};

const handleActionClick = (action?: () => void) => (event: React.MouseEvent<HTMLButtonElement>) => {
  event.stopPropagation();
  action?.();
  event.currentTarget.blur();
};

const handleItemKeyDown = (action?: () => void) => (event: React.KeyboardEvent<HTMLLIElement>) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  action?.();
};

interface ActionButtonProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  color?: IconButtonProps["color"];
  disableRipple?: boolean;
  children: React.ReactNode;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  onClick,
  disabled,
  color,
  disableRipple = false,
  children,
}) => (
  <IconButton
    edge="end"
    size="small"
    color={color}
    disableRipple={disableRipple}
    aria-label={label}
    onMouseDown={preventDragStart}
    onClick={handleActionClick(onClick)}
    disabled={disabled}
  >
    {children}
  </IconButton>
);

export const SelectableListItem = React.forwardRef<HTMLLIElement, SelectableListItemProps>(
  (
    {
      selectable,
      variant,
      onAssign,
      onMoveUp,
      onMoveDown,
      onRemove,
      disableMoveUp = false,
      disableMoveDown = false,
      isDragPlaceholder = false,
      dragHandleRef,
    },
    ref
  ) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const formatCurrency = useCurrencyFormatter();
    const isDraggable = dragHandleRef != null;
    const isAvailable = variant === "available";

    const actions =
      isAvailable ? (
        <ActionButton label={t("button.assign")} color="primary" onClick={onAssign}>
          <ArrowForwardIcon fontSize="small" />
        </ActionButton>
      ) : (
        <Stack direction="row" spacing={0.5}>
          <ActionButton label={t("button.moveUp")} onClick={onMoveUp} disabled={disableMoveUp} disableRipple>
            <ArrowUpwardIcon fontSize="small" />
          </ActionButton>
          <ActionButton label={t("button.moveDown")} onClick={onMoveDown} disabled={disableMoveDown} disableRipple>
            <ArrowDownwardIcon fontSize="small" />
          </ActionButton>
          <ActionButton label={t("delete")} color="error" onClick={onRemove} disableRipple>
            <DeleteIcon fontSize="small" />
          </ActionButton>
        </Stack>
      );

    const content = <ListItemText primary={selectable.name} secondary={formatCurrency(selectable.price)} />;

    return (
      <ListItem
        ref={ref}
        dense
        role={isAvailable ? "button" : undefined}
        tabIndex={isAvailable ? 0 : undefined}
        onClick={isAvailable ? onAssign : undefined}
        onKeyDown={isAvailable ? handleItemKeyDown(onAssign) : undefined}
        secondaryAction={actions}
        sx={selectableListSx(theme, { variant, isDragPlaceholder, isDraggable })}
      >
        {isDraggable ? (
          <Box
            ref={dragHandleRef}
            sx={{
              flex: 1,
              minWidth: 0,
              cursor: isDragPlaceholder ? "grabbing" : "grab",
            }}
          >
            {content}
          </Box>
        ) : (
          content
        )}
      </ListItem>
    );
  }
);

SelectableListItem.displayName = "SelectableListItem";
