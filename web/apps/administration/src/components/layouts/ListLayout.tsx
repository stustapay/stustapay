import { IRouteBuilder } from "@/app/routes";
import { Add as AddIcon } from "@mui/icons-material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CommonActionLayout } from "./CommonActionLayout";
import { LayoutAction } from "./types";
import { useCurrentNodeAllowsObject, useCurrentUserHasPrivilege } from "@/hooks";

export interface ListLayoutProps {
  title: string;
  routes?: IRouteBuilder;
  children?: React.ReactNode;
  additionalActions?: LayoutAction[];
}

export const ListLayout: React.FC<ListLayoutProps> = ({ title, children, routes, additionalActions = [] }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const hasPrivilege = useCurrentUserHasPrivilege(routes?.privilege);
  const allowsObject = useCurrentNodeAllowsObject(routes?.objectType);

  const actions = React.useMemo(() => {
    const a: LayoutAction[] = [];
    if (routes && hasPrivilege && allowsObject) {
      a.push({ label: t("add"), onClick: () => navigate(routes.add()), color: "primary", icon: <AddIcon /> });
    }

    return [...a, ...additionalActions];
  }, [navigate, t, additionalActions, routes, hasPrivilege, allowsObject]);

  return (
    <CommonActionLayout title={title} actions={actions}>
      {children}
    </CommonActionLayout>
  );
};
