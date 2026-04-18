import { useDeleteNodeSumupLinkMutation, useGetNodeSumupLinkStatusQuery } from "@/api";
import { useCurrentNode } from "@/hooks";
import { Alert, AlertTitle, Button, List, ListItem, ListItemText, Stack } from "@mui/material";
import { Loading } from "@stustapay/components";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { buildSumupOauthUrl } from "../sumupOauth";

export const TabNodeSumUp: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { data: linkStatus, isLoading, error } = useGetNodeSumupLinkStatusQuery({ nodeId: currentNode.id });
  const [deleteNodeSumupLink, deleteState] = useDeleteNodeSumupLinkMutation();
  const oauthClientId = linkStatus?.oauth_client_id ?? "";

  const handleConnect = () => {
    if (!linkStatus || oauthClientId.trim() === "") {
      toast.error(t("settings.sumup.oauthConfigMissing"));
      return;
    }
    window.location.href = buildSumupOauthUrl(currentNode.id, oauthClientId);
  };

  const handleDisconnect = () => {
    deleteNodeSumupLink({ nodeId: currentNode.id })
      .unwrap()
      .then(() => {
        toast.success(t("settings.sumup.disconnectSuccess"));
      })
      .catch((err) => {
        toast.error(t("settings.sumup.disconnectFailed", { reason: err?.data?.detail ?? err.error }));
      });
  };

  if (isLoading || (!linkStatus && !error)) {
    return <Loading />;
  }

  if (!linkStatus || error) {
    return (
      <Alert severity="error">
        <AlertTitle>{t("settings.sumup.linkLoadErrorTitle")}</AlertTitle>
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      {!linkStatus.oauth_configured && <Alert severity="warning">{t("settings.sumup.oauthConfigMissing")}</Alert>}
      {!linkStatus.affiliate_key_configured && <Alert severity="info">{t("settings.sumup.affiliateKeyMissing")}</Alert>}
      {linkStatus.connected ? (
        <Alert severity="success">{t("settings.sumup.linkConnected")}</Alert>
      ) : (
        <Alert severity="info">{t("settings.sumup.linkNotConnected")}</Alert>
      )}
      <List>
        <ListItem>
          <ListItemText primary={t("settings.sumup.sumup_merchant_code")} secondary={linkStatus.merchant_code ?? t("settings.sumup.secretNotConfigured")} />
        </ListItem>
        <ListItem>
          <ListItemText primary={t("settings.sumup.merchantName")} secondary={linkStatus.merchant_name ?? t("settings.sumup.secretNotConfigured")} />
        </ListItem>
        <ListItem>
          <ListItemText
            primary={t("settings.sumup.linkedEventCount")}
            secondary={t("settings.sumup.linkedEventCountValue", { count: linkStatus.linked_event_count })}
          />
        </ListItem>
      </List>
      <Stack direction="row" spacing={2}>
        <Button variant="contained" onClick={handleConnect} disabled={!linkStatus.oauth_configured}>
          {linkStatus.connected ? t("settings.sumup.reconnect") : t("settings.sumup.connect")}
        </Button>
        <Button variant="outlined" color="secondary" onClick={handleDisconnect} disabled={!linkStatus.connected || deleteState.isLoading}>
          {t("settings.sumup.disconnect")}
        </Button>
      </Stack>
    </Stack>
  );
};
