import {
  useCreateSharedTopupLinkMutation,
  useListSharedTopupContributionsQuery,
  useListSharedTopupLinksQuery,
  useRevokeSharedTopupLinkMutation,
} from "@/api";
import { PageContainer } from "@/components";
import { useCurrencyFormatter } from "@/hooks";
import { ContentCopy as ContentCopyIcon, Delete as DeleteIcon } from "@mui/icons-material";
import {
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

  const { data: sharedLinks } = useListSharedTopupLinksQuery();
  const { data: sharedContributions } = useListSharedTopupContributionsQuery();
  const [createSharedTopupLink] = useCreateSharedTopupLinkMutation();
  const [revokeSharedTopupLink] = useRevokeSharedTopupLinkMutation();
  const successfulContributions = React.useMemo(
    () => (sharedContributions ?? []).filter((contribution) => contribution.status === "booked"),
    [sharedContributions],
  );

  const [newSharedTopupLink, setNewSharedTopupLink] = React.useState<{ linkId: number; url: string } | null>(null);

  const copySharedTopupUrl = (url: string) => {
    navigator.clipboard.writeText(url)
      .then(() => toast.success(t("topup.shared.copied")))
      .catch(() => toast.error(t("topup.shared.copyFailed")));
  };

  const createSharedLink = () => {
    createSharedTopupLink({ createSharedTopupLinkPayload: {} })
      .unwrap()
      .then((link) => {
        if (!link.token) {
          return;
        }
        const url = `${window.location.origin}/shared-topup/${link.token}`;
        setNewSharedTopupLink({ linkId: link.id, url });
        void navigator.clipboard.writeText(url).catch(() => undefined);
        toast.success(t("topup.shared.created"));
      })
      .catch((error) => {
        console.error(error);
        toast.error(t("topup.shared.createFailed"));
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

  return (
    <PageContainer title={t("topup.shared.ownerTitle")}>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">{t("topup.shared.ownerDescription")}</Typography>
        <Button variant="outlined" onClick={createSharedLink}>
          {t("topup.shared.createLink")}
        </Button>

        {newSharedTopupLink && (
          <Stack spacing={2} sx={{ alignItems: "flex-start" }}>
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
                  <TableCell>{t("topup.shared.createdAt")}</TableCell>
                  <TableCell>{t("topup.shared.status")}</TableCell>
                  <TableCell align="right">{t("topup.shared.actions")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sharedLinks.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell>{new Date(link.created_at).toLocaleString()}</TableCell>
                    <TableCell>{link.revoked_at ? t("topup.shared.revokedStatus") : t("topup.shared.activeStatus")}</TableCell>
                    <TableCell align="right">
                      {!link.revoked_at && (
                        <IconButton aria-label={t("topup.shared.revoke")} onClick={() => revokeSharedLink(link.id)} size="small">
                          <DeleteIcon />
                        </IconButton>
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
