import { Identifier, XYCoord } from "dnd-core";
import * as React from "react";
import { ListItem, ListItemText, useTheme } from "@mui/material";
import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { DraggableItemTypes } from "@core/draggable";
import { Product } from "@models";

export interface DraggableProductProps {
  product: Product;
  moveProduct: (productId: number, hoveredProductId: number, hoveredBelow: boolean) => void;
}

export interface DragProduct {
  id: number;
  type: string;
}

export const DraggableProduct: React.FC<DraggableProductProps> = ({ product, moveProduct }) => {
  const theme = useTheme();
  const ref = useRef<HTMLLIElement>(null);

  const [{ handlerId }, drop] = useDrop<DragProduct, void, { handlerId: Identifier | null }>({
    accept: DraggableItemTypes.PRODUCT,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item: DragProduct, monitor) {
      if (!ref.current) {
        return;
      }
      // Don't replace items with themselves
      if (item.id === product.id) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      if (clientOffset === null) {
        return;
      }

      // Get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%
      if (clientOffset.y < hoverBoundingRect.top || clientOffset.y > hoverBoundingRect.bottom) {
        return;
      }

      if (hoverClientY < hoverMiddleY) {
        moveProduct(item.id, product.id, true);
      } else if (hoverClientY > hoverMiddleY) {
        moveProduct(item.id, product.id, false);
      }
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: DraggableItemTypes.PRODUCT,
    item: () => {
      return { id: product.id };
    },
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const opacity = isDragging ? 0 : 1;
  drag(drop(ref));
  return (
    <ListItem ref={ref} data-handler-id={handlerId} sx={{ opacity: opacity, boxShadow: theme.shadows[1] }}>
      <ListItemText primary={product.name} secondary={`${product.price}€`} />
    </ListItem>
  );
};
