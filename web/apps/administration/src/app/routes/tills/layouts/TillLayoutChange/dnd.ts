export const LayoutEditorItemType = "LAYOUT_EDITOR_ITEM";

export type LayoutEditorDragSource = "available" | "assigned";

export interface LayoutEditorDragItem {
  id: number;
  name: string;
  price: number;
  width: number;
  source: LayoutEditorDragSource;
}
