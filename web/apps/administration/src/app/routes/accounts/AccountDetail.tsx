import { useGetAccountQuery } from "@/api";
import { AccountRoutes, CustomerRoutes } from "@/app/routes";
import { useCurrentNode } from "@/hooks";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { SystemAccountDetail } from "./SystemAccountDetail";

export const AccountDetail: React.FC = () => {
  const { accountId } = useParams();
  const navigate = useNavigate();
  const { currentNode } = useCurrentNode();
  const {
    data: account,
    error,
    isLoading: isAccountLoading,
  } = useGetAccountQuery({ nodeId: currentNode.id, accountId: Number(accountId) });

  if (isAccountLoading || (!account && !error)) {
    return <Loading />;
  }

  if (error || !account) {
    toast.error("Error loading account");
    navigate(AccountRoutes.list());
    return null;
  }

  if (account.type === "private") {
    return <Navigate to={CustomerRoutes.detail(account.id, account.node_id)} />;
  } else {
    return <SystemAccountDetail account={account} />;
  }
};
