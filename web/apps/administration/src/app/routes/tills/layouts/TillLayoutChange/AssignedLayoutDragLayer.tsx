import { Paper, Typography, useTheme } from "@mui/material";
import * as React from "react";
import { useDragLayer } from "react-dnd";

import { useCurrencyFormatter } from "@/hooks";

import { LayoutEditorDragItem, LayoutEditorItemType } from "./dnd";

export const AssignedLayoutDragLayer: React.FC = () => {
  const theme = useTheme();
  const formatCurrency = useCurrencyFormatter();

  const { isDragging, item, currentOffset, itemType } = useDragLayer((monitor) => ({
    isDragging: monitor.isDragging(),
    item: monitor.getItem() as LayoutEditorDragItem | null,
    currentOffset: monitor.getClientOffset(),
    itemType: monitor.getItemType(),
  }));

  if (!isDragging || itemType !== LayoutEditorItemType || !item || !currentOffset) {
    return null;
  }

  return (
    <Paper
      elevation={12}
      sx={{
        position: "fixed",
        pointerEvents: "none",
        zIndex: theme.zIndex.modal,
        left: 0,
        top: 0,
        width: item.width,
        px: 2,
        py: 1.5,
        borderRadius: 1,
        border: 2,
        borderColor: "primary.main",
        bgcolor: "background.paper",
        boxShadow: theme.shadows[12],
        transform: `translate(calc(${currentOffset.x}px + 12px), calc(${currentOffset.y}px - 50%))`,
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {item.name}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {formatCurrency(item.price)}
      </Typography>
    </Paper>
  );
};
