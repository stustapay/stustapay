import * as React from "react";
import { useEffect, useRef } from "react";
import { useDrag } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";

import { LayoutEditorDragItem, LayoutEditorItemType } from "./dnd";
import { SelectableListItem } from "./SelectableListItem";
import { Selectable } from "./types";

export interface DraggableAvailableListItemProps {
  selectable: Selectable;
  onAssign: () => void;
}

export const DraggableAvailableListItem: React.FC<DraggableAvailableListItemProps> = ({
  selectable,
  onAssign,
}) => {
  const rowRef = useRef<HTMLLIElement>(null);

  const [{ isDragging }, drag, preview] = useDrag<
    LayoutEditorDragItem,
    void,
    { isDragging: boolean }
  >({
    type: LayoutEditorItemType,
    item: () => ({
      id: selectable.id,
      name: selectable.name,
      price: selectable.price,
      width: rowRef.current?.offsetWidth ?? 280,
      source: "available",
    }),
    isDragging: (monitor) =>
      monitor.getItem().id === selectable.id && monitor.getItem().source === "available",
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  drag(rowRef);

  return (
    <SelectableListItem
      ref={rowRef}
      selectable={selectable}
      variant="available"
      isDragPlaceholder={isDragging}
      onAssign={onAssign}
    />
  );
};
