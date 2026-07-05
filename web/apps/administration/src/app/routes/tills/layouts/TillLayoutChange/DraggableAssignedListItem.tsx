import * as React from "react";
import { useEffect, useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";

import { LayoutEditorDragItem, LayoutEditorItemType } from "./dnd";
import { SelectableListItem } from "./SelectableListItem";
import { Selectable } from "./types";

export interface DraggableAssignedListItemProps {
  selectable: Selectable;
  placeItem: (item: LayoutEditorDragItem, hoveredItemId: number, hoveredBelow: boolean) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove?: () => void;
  disableMoveUp?: boolean;
  disableMoveDown?: boolean;
}

export const DraggableAssignedListItem: React.FC<DraggableAssignedListItemProps> = ({
  selectable,
  placeItem,
  onMoveUp,
  onMoveDown,
  onRemove,
  disableMoveUp = false,
  disableMoveDown = false,
}) => {
  const rowRef = useRef<HTMLLIElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  const [, drop] = useDrop<LayoutEditorDragItem>({
    accept: LayoutEditorItemType,
    hover(item, monitor) {
      if (item.id === selectable.id) {
        return;
      }
      if (!rowRef.current) {
        return;
      }

      const hoverBoundingRect = rowRef.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (clientOffset === null) {
        return;
      }

      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (clientOffset.y < hoverBoundingRect.top || clientOffset.y > hoverBoundingRect.bottom) {
        return;
      }

      if (hoverClientY < hoverMiddleY) {
        placeItem(item, selectable.id, true);
      } else if (hoverClientY > hoverMiddleY) {
        placeItem(item, selectable.id, false);
      }
    },
  });

  const [{ isDragging }, drag, preview] = useDrag<LayoutEditorDragItem, void, { isDragging: boolean }>({
    type: LayoutEditorItemType,
    item: () => ({
      id: selectable.id,
      name: selectable.name,
      price: selectable.price,
      width: rowRef.current?.offsetWidth ?? 280,
      source: "assigned",
    }),
    isDragging: (monitor) => monitor.getItem().id === selectable.id,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  drop(rowRef);
  drag(dragHandleRef);

  return (
    <SelectableListItem
      ref={rowRef}
      dragHandleRef={dragHandleRef}
      selectable={selectable}
      variant="assigned"
      isDragPlaceholder={isDragging}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onRemove={onRemove}
      disableMoveUp={disableMoveUp}
      disableMoveDown={disableMoveDown}
    />
  );
};
