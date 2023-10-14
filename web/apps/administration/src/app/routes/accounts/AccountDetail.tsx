import { useGetAccountQuery } from "@/api";
import { AccountRoutes } from "@/app/routes";
import { useCurrentNode } from "@/hooks";
import { Alert, AlertTitle } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { CustomerAccountDetail } from "./CustomerAccountDetail";
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
    return <CustomerAccountDetail account={account} />;
  } else if (account.type === "virtual" || account.type === "internal") {
    return <SystemAccountDetail account={account} />;
  }

  return (
    <Alert severity="error">
      <AlertTitle>Unknown account type {account.type}</AlertTitle>
    </Alert>
  );
};
