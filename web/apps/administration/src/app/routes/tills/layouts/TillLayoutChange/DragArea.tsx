import { Box, Typography } from "@mui/material";
import { Identifier } from "dnd-core";
import * as React from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";

import { DraggableItemTypes } from "@/core";

import { DragButton } from "./DraggableButton";

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
    hover(item: DragButton, _monitor) {
      moveButton(item.id);
    },
  });

  return (
    // TODO: fix the type issue with the ref, currently we need to cast it to any
    <Box ref={drop as any} sx={{ minHeight: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Typography>{t("button.dragButtonHere")}</Typography>
    </Box>
  );
};
