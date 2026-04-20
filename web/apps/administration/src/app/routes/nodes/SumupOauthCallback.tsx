import { useConfigureSumupTokenMutation } from "@/api";
import { Alert } from "@mui/material";
import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Loading } from "@stustapay/components";
import {
  clearSumupOauthStateNonce,
  getSumupOauthRedirectUrl,
  peekValidatedSumupOauthState,
} from "./sumupOauth";

const exchangeStartedKey = (authorizationCode: string) => `sumup-oauth-exchange-started:${authorizationCode}`;
const exchangeCompletedKey = (authorizationCode: string) => `sumup-oauth-exchange-completed:${authorizationCode}`;
const exchangeFailedKey = (authorizationCode: string) => `sumup-oauth-exchange-failed:${authorizationCode}`;

export const SumupOauthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [configureSumup] = useConfigureSumupTokenMutation();
  const [state, setState] = React.useState<"loading" | "error" | "success">("loading");

  React.useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      toast.error("Code parameter is not set", { toastId: "sumup-oauth-missing-code" });
      setState("error");
      return;
    }

    const startedKey = exchangeStartedKey(code);
    const completedKey = exchangeCompletedKey(code);
    const failedKey = exchangeFailedKey(code);

    const finishSuccess = (nodeId: number) => {
      sessionStorage.removeItem(completedKey);
      sessionStorage.removeItem(startedKey);
      sessionStorage.removeItem(failedKey);
      toast.success("Successfully logged in to sumup", { toastId: `sumup-oauth-ok-${code}` });
      setState("success");
      navigate(`/node/${nodeId}/settings?tab=sumupConnection`, { replace: true });
    };

    const completedRaw = sessionStorage.getItem(completedKey);
    if (completedRaw) {
      try {
        const { nodeId } = JSON.parse(completedRaw) as { nodeId: number };
        finishSuccess(nodeId);
      } catch {
        sessionStorage.removeItem(completedKey);
        sessionStorage.removeItem(startedKey);
        sessionStorage.removeItem(failedKey);
        toast.error("Invalid SumUp OAuth completion payload", { toastId: `sumup-oauth-bad-complete-${code}` });
        setState("error");
      }
      return;
    }

    if (sessionStorage.getItem(failedKey) === "1") {
      sessionStorage.removeItem(completedKey);
      sessionStorage.removeItem(startedKey);
      sessionStorage.removeItem(failedKey);
      toast.error("Error logging in to sumup", { toastId: `sumup-oauth-err-${code}` });
      setState("error");
      return;
    }

    let cancelled = false;
    let intervalId = 0;
    let stopId = 0;

    const pollOnce = () => {
      if (cancelled) {
        return;
      }
      if (sessionStorage.getItem(failedKey) === "1") {
        window.clearInterval(intervalId);
        window.clearTimeout(stopId);
        sessionStorage.removeItem(failedKey);
        sessionStorage.removeItem(startedKey);
        toast.error("Error logging in to sumup", { toastId: `sumup-oauth-err-${code}` });
        setState("error");
        return;
      }
      const done = sessionStorage.getItem(completedKey);
      if (!done) {
        return;
      }
      window.clearInterval(intervalId);
      window.clearTimeout(stopId);
      try {
        const { nodeId } = JSON.parse(done) as { nodeId: number };
        finishSuccess(nodeId);
      } catch {
        sessionStorage.removeItem(completedKey);
        sessionStorage.removeItem(startedKey);
        sessionStorage.removeItem(failedKey);
        toast.error("Invalid SumUp OAuth completion payload", { toastId: `sumup-oauth-bad-complete-${code}` });
        setState("error");
      }
    };

    intervalId = window.setInterval(pollOnce, 50);
    stopId = window.setTimeout(() => {
      window.clearInterval(intervalId);
      if (sessionStorage.getItem(startedKey) === "1" && sessionStorage.getItem(completedKey) === null) {
        sessionStorage.removeItem(startedKey);
        sessionStorage.removeItem(failedKey);
        setState((prev) => (prev === "loading" ? "error" : prev));
        toast.error("SumUp login timed out", { toastId: `sumup-oauth-timeout-${code}` });
      }
    }, 120_000);
    pollOnce();

    if (sessionStorage.getItem(startedKey) === "1") {
      return () => {
        cancelled = true;
        window.clearInterval(intervalId);
        window.clearTimeout(stopId);
      };
    }

    sessionStorage.setItem(startedKey, "1");
    const oauthState = peekValidatedSumupOauthState(searchParams.get("state"));
    if (!oauthState) {
      sessionStorage.removeItem(startedKey);
      window.clearInterval(intervalId);
      window.clearTimeout(stopId);
      toast.error("Invalid or expired SumUp OAuth state", { toastId: `sumup-oauth-bad-state-${code}` });
      setState("error");
      return;
    }

    configureSumup({
      nodeId: oauthState.nodeId,
      sumUpTokenPayload: { authorization_code: code, redirect_uri: getSumupOauthRedirectUrl() },
    })
      .unwrap()
      .then(() => {
        sessionStorage.setItem(completedKey, JSON.stringify({ nodeId: oauthState.nodeId }));
        clearSumupOauthStateNonce(oauthState.nonce);
        sessionStorage.removeItem(startedKey);
        if (!cancelled) {
          pollOnce();
        }
      })
      .catch(() => {
        sessionStorage.setItem(failedKey, "1");
        sessionStorage.removeItem(startedKey);
        clearSumupOauthStateNonce(oauthState.nonce);
        if (!cancelled) {
          pollOnce();
        }
      });

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.clearTimeout(stopId);
    };
  }, [searchParams, configureSumup, navigate]);

  if (state === "loading") {
    return <Loading />;
  }

  if (state === "error") {
    return <Alert severity="error">Sumup login error</Alert>;
  }

  return <Alert severity="success">Sumup login successful</Alert>;
};
