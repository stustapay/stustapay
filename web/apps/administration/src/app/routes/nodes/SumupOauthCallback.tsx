import { useConfigureSumupTokenMutation } from "@/api";
import { useCurrentNode } from "@/hooks";
import { Alert } from "@mui/material";
import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Loading } from "@stustapay/components";

export const SumupOauthCallback = () => {
  const { currentNode } = useCurrentNode();
  const [searchParams] = useSearchParams();
  const [configureSumup] = useConfigureSumupTokenMutation();
  const [state, setState] = React.useState<"loading" | "error" | "success">("loading");

  React.useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      toast.error("Code parameter is not set");
      return;
    }

    configureSumup({ nodeId: currentNode.id, sumUpTokenPayload: { authorization_code: code } })
      .unwrap()
      .then(() => {
        toast.success("Successfully logged in to sumup");
        setState("success");
      })
      .catch(() => {
        toast.error("Error logging in to sumup");
        setState("error");
      });
  }, [currentNode, searchParams, configureSumup]);

  if (state === "loading") {
    return <Loading />;
  }

  if (state === "error") {
    return <Alert severity="error">Sumup login error</Alert>;
  }

  return <Alert severity="success">Sumup login successful</Alert>;
};
