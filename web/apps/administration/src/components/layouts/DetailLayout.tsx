import * as React from "react";
import { CommonActionLayout } from "./CommonActionLayout";
import { LayoutAction } from "./types";

export interface DetailLayoutProps {
  title: string;
  children?: React.ReactNode;
  actions?: LayoutAction[];
}

export const DetailLayout: React.FC<DetailLayoutProps> = ({ title, children, actions }) => {
  return (
    <CommonActionLayout title={title} actions={actions}>
      {children}
    </CommonActionLayout>
  );
};
