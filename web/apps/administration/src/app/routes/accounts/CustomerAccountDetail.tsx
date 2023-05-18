import * as React from "react";
import { Paper, ListItem, ListItemText, List, ListItemSecondaryAction, IconButton, Button, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, Link as RouterLink } from "react-router-dom";
import {
  selectAccountById,
  selectOrderAll,
  useDisableAccountMutation,
  useGetAccountByIdQuery,
  useGetOrderByCustomerQuery,
  useUpdateAccountCommentMutation,
} from "@api";
import { Loading } from "@stustapay/components";
import { toast } from "react-toastify";
import { EditableListItem, OrderTable } from "@components";
import { useCurrencyFormatter } from "@hooks";
import { Edit as EditIcon } from "@mui/icons-material";
import { EditAccountBalanceModal } from "./components/EditAccountBalanceModal";
import { EditAccountVoucherAmountModal } from "./components/EditAccountVoucherAmountModal";
import { EditAccountTagModal } from "./components/EditAccountTagModal";
import { formatUserTagUid } from "@stustapay/models";
import { AccountTagHistoryTable } from "./components/AccountTagHistoryTable";

export const CustomerAccountDetail: React.FC = () => {
  const { t } = useTranslation();
  const { accountId } = useParams();
  const navigate = useNavigate();

  const formatCurrency = useCurrencyFormatter();
  const [disableAccount] = useDisableAccountMutation();
  const [updateComment] = useUpdateAccountCommentMutation();

  const [balanceModalOpen, setBalanceModalOpen] = React.useState(false);
  const [voucherModalOpen, setVoucherModalOpen] = React.useState(false);
  const [tagModalOpen, setTagModalOpen] = React.useState(false);

  const {
    account,
    error,
    isLoading: isAccountLoading,
  } = useGetAccountByIdQuery(Number(accountId), {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      account: data ? selectAccountById(data, Number(accountId)) : undefined,
    }),
  });
  const {
    orders,
    error: orderError,
    isLoading: isOrdersLoading,
  } = useGetOrderByCustomerQuery(Number(accountId), {
    selectFromResult: ({ data, ...rest }) => ({
      ...rest,
      orders: data ? selectOrderAll(data) : undefined,
    }),
  });

  if (isAccountLoading || isOrdersLoading || (!account && !error) || (!orders && !orderError)) {
    return <Loading />;
  }

  if (error || !account || orderError || !orders) {
    toast.error("Error loading account");
    navigate(-1);
    return null;
  }

  const handleDisableAccount = () => {
    disableAccount({ accountId: Number(accountId) })
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
    updateComment({ accountId: Number(accountId), comment: newComment });
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
                <RouterLink to={`/user-tags/${account.user_tag_uid_hex}`}>
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
