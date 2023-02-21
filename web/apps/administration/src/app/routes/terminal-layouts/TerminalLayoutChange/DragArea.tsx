import * as React from "react";
import { useDrop } from "react-dnd";
import { Identifier } from "dnd-core";
import { DragProduct } from "./DraggableProduct";
import { DraggableItemTypes } from "@core";

export interface EmptyDragProps {
  moveProduct: (productId: number) => void;
  children?: React.ReactNode;
}

export const DragArea: React.FC<EmptyDragProps> = ({ moveProduct, children }) => {
  const [{ handlerId }, drop] = useDrop<DragProduct, void, { handlerId: Identifier | null }>({
    accept: DraggableItemTypes.PRODUCT,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: DragProduct, monitor) {
      moveProduct(item.id);
    },
  });

  return (
    <div ref={drop} style={{ minHeight: "200px" }}>
      {children ?? "drag product here"}
    </div>
  );
};
