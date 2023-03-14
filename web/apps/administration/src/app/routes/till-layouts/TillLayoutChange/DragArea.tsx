import * as React from "react";
import { useDrop } from "react-dnd";
import { Identifier } from "dnd-core";
import { DragButton } from "./DraggableButton";
import { DraggableItemTypes } from "@core";

export interface EmptyDragProps {
  moveButton: (buttonId: number) => void;
  children?: React.ReactNode;
}

export const DragArea: React.FC<EmptyDragProps> = ({ moveButton, children }) => {
  const [{ handlerId }, drop] = useDrop<DragButton, void, { handlerId: Identifier | null }>({
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
    <div ref={drop} style={{ minHeight: "200px" }}>
      {children ?? "drag button here"}
    </div>
  );
};
