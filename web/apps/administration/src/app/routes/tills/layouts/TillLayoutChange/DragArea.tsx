import { DraggableItemTypes } from "@/core";
import { Identifier } from "dnd-core";
import * as React from "react";
import { useDrop } from "react-dnd";
import { DragButton } from "./DraggableButton";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

export interface EmptyDragProps {
  moveButton: (buttonId: number) => void;
}

export const DragArea: React.FC<EmptyDragProps> = ({ moveButton }) => {
  const { t } = useTranslation();
  const [, drop] = useDrop<DragButton, void, { handlerId: Identifier | null }>({
    accept: DraggableItemTypes.TILL_BUTTON,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: DragButton, monitor) {
      moveButton(item.id);
    },
  });

  return (
    <Box ref={drop} minHeight="200px" display="flex" alignItems="center" justifyContent="center">
      <Typography>{t("button.dragButtonHere")}</Typography>
    </Box>
  );
};
