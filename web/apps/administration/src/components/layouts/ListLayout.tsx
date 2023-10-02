import { IRouteBuilder } from "@/app/routes";
import { Add as AddIcon } from "@mui/icons-material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CommonActionLayout } from "./CommonActionLayout";
import { LayoutAction } from "./types";

export interface ListLayoutProps {
  title: string;
  routes?: IRouteBuilder;
  children?: React.ReactNode;
  additionalActions?: LayoutAction[];
}

export const ListLayout: React.FC<ListLayoutProps> = ({ title, children, routes, additionalActions = [] }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const actions = React.useMemo(() => {
    const a: LayoutAction[] = [];
    if (routes) {
      a.push({ label: t("add"), onClick: () => navigate(routes.add()), color: "primary", icon: <AddIcon /> });
    }

    return [...a, ...additionalActions];
  }, [navigate, t, additionalActions, routes]);

  return (
    <CommonActionLayout title={title} actions={actions}>
      {children}
    </CommonActionLayout>
  );
};
