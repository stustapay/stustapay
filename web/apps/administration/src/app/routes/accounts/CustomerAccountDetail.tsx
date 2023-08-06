import {
  Account,
  selectOrderAll,
  useDisableAccountMutation,
  useListOrdersQuery,
  useUpdateAccountCommentMutation,
} from "@/api";
import { UserTagRoutes } from "@/app/routes";
import { EditableListItem } from "@/components";
import { OrderTable } from "@/components/features";
import { useCurrencyFormatter } from "@/hooks";
import { Edit as EditIcon } from "@mui/icons-material";
import { Button, IconButton, List, ListItem, ListItemSecondaryAction, ListItemText, Paper, Stack } from "@mui/material";
import { Loading } from "@stustapay/components";
import { formatUserTagUid } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AccountTagHistoryTable } from "./components/AccountTagHistoryTable";
import { EditAccountBalanceModal } from "./components/EditAccountBalanceModal";
import { EditAccountTagModal } from "./components/EditAccountTagModal";
import { EditAccountVoucherAmountModal } from "./components/EditAccountVoucherAmountModal";

export const CustomerAccountDetail: React.FC<{ account: Account }> = ({ account }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const formatCurrency = useCurrencyFormatter();
  const [disableAccount] = useDisableAccountMutation();
  const [updateComment] = useUpdateAccountCommentMutation();

  const [balanceModalOpen, setBalanceModalOpen] = React.useState(false);
  const [voucherModalOpen, setVoucherModalOpen] = React.useState(false);
  const [tagModalOpen, setTagModalOpen] = React.useState(false);

  const {
    orders,
    error: orderError,
    isLoading: isOrdersLoading,
  } = useListOrdersQuery(
    { customerAccountId: account.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        orders: data ? selectOrderAll(data) : undefined,
      }),
    }
  );

  if (isOrdersLoading || (!orders && !orderError)) {
    return <Loading />;
  }

  if (orderError || !orders) {
    toast.error("Error loading account");
    navigate(-1);
    return null;
  }

  const handleDisableAccount = () => {
    disableAccount({ accountId: account.id })
      .unwrap()
      .then(() => {
        toast.success(t("account.disableSuccess"));
      })
      .catch((e) => {
        console.error("Error while disabling account", e);
        toast.error(`Error while disabling account`);
      });
  };

  const handleUpdateComment = (newComment: string) => {
    updateComment({ accountId: account.id, updateAccountCommentPayload: { comment: newComment } });
  };

  return (
    <Stack spacing={2}>
      <Paper>
        <ListItem
          secondaryAction={
            <Button color="error" onClick={handleDisableAccount}>
              {t("account.disable")}
            </Button>
          }
        >
          <ListItemText primary={account.id} />
        </ListItem>
      </Paper>
      <Paper>
        <List>
          <ListItem>
            <ListItemText primary={t("account.id")} secondary={account.id} />
          </ListItem>
          <ListItem>
            <ListItemText primary={t("account.type")} secondary={account.type} />
          </ListItem>
          <ListItem>
            <ListItemText
              primary={t("account.user_tag_uid")}
              secondary={
                <RouterLink to={UserTagRoutes.detail(account.user_tag_uid_hex)}>
                  {formatUserTagUid(account.user_tag_uid_hex)}
                </RouterLink>
              }
            />
            <ListItemSecondaryAction>
              <IconButton color="primary" onClick={() => setTagModalOpen(true)}>
                <EditIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
          <ListItem>
            <ListItemText primary={t("account.name")} secondary={account.name} />
          </ListItem>
          <EditableListItem label={t("account.comment")} value={account.comment ?? ""} onChange={handleUpdateComment} />
          <ListItem>
            <ListItemText primary={t("account.balance")} secondary={formatCurrency(account.balance)} />
            {/* {isAdmin && (
              <ListItemSecondaryAction>
                <IconButton color="primary" onClick={() => setBalanceModalOpen(true)}>
                  <EditIcon />
                </IconButton>
              </ListItemSecondaryAction>
            )} */}
          </ListItem>
          <ListItem>
            <ListItemText primary={t("account.vouchers")} secondary={account.vouchers} />
            <ListItemSecondaryAction>
              <IconButton color="primary" onClick={() => setVoucherModalOpen(true)}>
                <EditIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        </List>
      </Paper>
      {account.tag_history.length > 0 && <AccountTagHistoryTable history={account.tag_history} />}
      {account && (
        <>
          <EditAccountBalanceModal
            account={account}
            open={balanceModalOpen}
            handleClose={() => setBalanceModalOpen(false)}
          />
          <EditAccountVoucherAmountModal
            account={account}
            open={voucherModalOpen}
            handleClose={() => setVoucherModalOpen(false)}
          />
          <EditAccountTagModal account={account} open={tagModalOpen} handleClose={() => setTagModalOpen(false)} />
        </>
      )}
      <OrderTable orders={orders} />
    </Stack>
  );
};
