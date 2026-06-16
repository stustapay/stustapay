import {
  useCreateSharedTopupLinkMutation,
  useListSharedTopupContributionsQuery,
  useListSharedTopupLinksQuery,
  useRevokeSharedTopupLinkMutation,
} from "@/api";
import { PageContainer } from "@/components";
import { useCurrencyFormatter, usePublicConfig } from "@/hooks";
import { ContentCopy as ContentCopyIcon, Delete as DeleteIcon, Sync as SyncIcon } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import * as React from "react";
import QRCode from "react-qr-code";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

export const SharedTopUpOwner: React.FC = () => {
  const { t } = useTranslation();
  const formatCurrency = useCurrencyFormatter();
  const publicConfig = usePublicConfig();

  const { data: sharedLinks } = useListSharedTopupLinksQuery();
  const { data: sharedContributions } = useListSharedTopupContributionsQuery();
  const [createSharedTopupLink] = useCreateSharedTopupLinkMutation();
  const [revokeSharedTopupLink] = useRevokeSharedTopupLinkMutation();
  const successfulContributions = React.useMemo(
    () => (sharedContributions ?? []).filter((contribution) => contribution.status === "booked"),
    [sharedContributions],
  );

  const [newSharedTopupLink, setNewSharedTopupLink] = React.useState<{ linkId: number; url: string } | null>(null);
  const [linkLabel, setLinkLabel] = React.useState("");

  if (!publicConfig.group_topup_enabled) {
    return (
      <PageContainer title={t("topup.shared.ownerTitle")}>
        <Alert severity="warning">{t("topup.shared.disabled")}</Alert>
      </PageContainer>
    );
  }

  const copySharedTopupUrl = (url: string) => {
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success(t("topup.shared.copied")))
      .catch(() => toast.error(t("topup.shared.copyFailed")));
  };

  const createSharedLink = (label = linkLabel, notify = true) => {
    const trimmedLabel = label.trim();
    return createSharedTopupLink({ createSharedTopupLinkPayload: { label: trimmedLabel === "" ? null : trimmedLabel } })
      .unwrap()
      .then((link) => {
        if (!link.token) {
          return null;
        }
        const url = `${window.location.origin}/shared-topup/${link.token}`;
        setNewSharedTopupLink({ linkId: link.id, url });
        setLinkLabel("");
        void navigator.clipboard.writeText(url).catch(() => undefined);
        if (notify) {
          toast.success(t("topup.shared.created"));
        }
        return link;
      })
      .catch((error) => {
        console.error(error);
        toast.error(t("topup.shared.createFailed"));
        return null;
      });
  };

  const revokeSharedLink = (linkId: number) => {
    revokeSharedTopupLink({ linkId })
      .unwrap()
      .then(() => {
        if (newSharedTopupLink?.linkId === linkId) {
          setNewSharedTopupLink(null);
        }
        toast.success(t("topup.shared.revoked"));
      })
      .catch((error) => {
        console.error(error);
        toast.error(t("topup.shared.revokeFailed"));
      });
  };

  const replaceSharedLink = (linkId: number, label: string | null) => {
    revokeSharedTopupLink({ linkId })
      .unwrap()
      .then(() => createSharedLink(label ?? "", false))
      .then((link) => {
        if (link !== null) {
          toast.success(t("topup.shared.replaced"));
        }
      })
      .catch((error) => {
        console.error(error);
        toast.error(t("topup.shared.replaceFailed"));
      });
  };

  return (
    <PageContainer title={t("topup.shared.ownerTitle")}>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">{t("topup.shared.ownerDescription")}</Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField
            label={t("topup.shared.label")}
            value={linkLabel}
            onChange={(event) => setLinkLabel(event.target.value)}
            fullWidth
          />
          <Button variant="outlined" onClick={() => void createSharedLink()} sx={{ flexShrink: 0 }}>
            {t("topup.shared.createLink")}
          </Button>
        </Stack>

        {newSharedTopupLink && (
          <Stack spacing={2} sx={{ alignItems: "flex-start" }}>
            <Alert severity="info">{t("topup.shared.oneTimeLinkNotice")}</Alert>
            <Box sx={{ p: 2, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", width: 180 }}>
              <QRCode value={newSharedTopupLink.url} size={144} />
            </Box>
            <TextField
              label={t("topup.shared.link")}
              value={newSharedTopupLink.url}
              fullWidth
              slotProps={{ input: { readOnly: true } }}
            />
            <Button startIcon={<ContentCopyIcon />} onClick={() => copySharedTopupUrl(newSharedTopupLink.url)}>
              {t("topup.shared.copy")}
            </Button>
          </Stack>
        )}

        {sharedLinks && sharedLinks.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t("topup.shared.label")}</TableCell>
                  <TableCell>{t("topup.shared.createdAt")}</TableCell>
                  <TableCell>{t("topup.shared.status")}</TableCell>
                  <TableCell align="right">{t("topup.shared.actions")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sharedLinks.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell>{link.label || t("topup.shared.noLabel")}</TableCell>
                    <TableCell>{new Date(link.created_at).toLocaleString()}</TableCell>
                    <TableCell>{link.revoked_at ? t("topup.shared.revokedStatus") : t("topup.shared.activeStatus")}</TableCell>
                    <TableCell align="right">
                      {!link.revoked_at && (
                        <>
                          <IconButton
                            aria-label={t("topup.shared.replace")}
                            onClick={() => replaceSharedLink(link.id, link.label)}
                            size="small"
                          >
                            <SyncIcon />
                          </IconButton>
                          <IconButton aria-label={t("topup.shared.revoke")} onClick={() => revokeSharedLink(link.id)} size="small">
                            <DeleteIcon />
                          </IconButton>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Typography variant="h6">{t("topup.shared.contributionsTitle")}</Typography>
        {successfulContributions.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t("topup.shared.name")}</TableCell>
                  <TableCell align="right">{t("topup.amount")}</TableCell>
                  <TableCell>{t("topup.shared.status")}</TableCell>
                  <TableCell>{t("topup.shared.createdAt")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {successfulContributions.map((contribution) => (
                  <TableRow key={contribution.order_uuid}>
                    <TableCell>{contribution.contributor_name}</TableCell>
                    <TableCell align="right">{formatCurrency(contribution.amount)}</TableCell>
                    <TableCell>{t(`topup.shared.contributionStatus.${contribution.status}` as never)}</TableCell>
                    <TableCell>{new Date(contribution.booked_at ?? contribution.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" color="text.secondary">{t("topup.shared.noContributions")}</Typography>
        )}
      </Stack>
    </PageContainer>
  );
};
