import { ExpandableLinkMenu, ListItemLink } from "@/components";
import { selectCurrentUser, useAppSelector } from "@/store";
import {
  AccountBalance as AccountBalanceIcon,
  AddShoppingCart as AddShoppingCartIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
  Dashboard as DashboardIcon,
  Money as MoneyIcon,
  Percent as PercentIcon,
  Person as PersonIcon,
  PointOfSale as PointOfSaleIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  ShoppingCart as ShoppingCartIcon,
} from "@mui/icons-material";
import { List, ListItemIcon, ListItemText } from "@mui/material";
import { CurrentUser } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";

const AdvancedMenu: React.FC<{ user: CurrentUser }> = ({ user }) => {
  const { t } = useTranslation();
  return (
    <ExpandableLinkMenu label={t("advanced")}>
      <List sx={{ pl: 2 }}>
        {user.privileges.includes("user_management") && (
          <>
            <ListItemLink to="/users">
              <ListItemIcon>
                <PersonIcon />
              </ListItemIcon>
              <ListItemText primary={t("users")} />
            </ListItemLink>
            <ListItemLink to="/user-roles">
              <ListItemIcon>
                <PersonIcon />
              </ListItemIcon>
              <ListItemText primary={t("userRoles")} />
            </ListItemLink>
          </>
        )}
        {user.privileges.includes("tax_rate_management") && (
          <ListItemLink to="/tax-rates">
            <ListItemIcon>
              <PercentIcon />
            </ListItemIcon>
            <ListItemText primary={t("taxRates")} />
          </ListItemLink>
        )}
        {user.privileges.includes("config_management") && (
          <ListItemLink to="/settings">
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary={t("settings.title")} />
          </ListItemLink>
        )}
      </List>
    </ExpandableLinkMenu>
  );
};

export const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const user = useAppSelector(selectCurrentUser);

  if (!user) {
    return null;
  }

  return (
    <List>
      <ListItemLink to="/overview/festival">
        <ListItemIcon>
          <DashboardIcon />
        </ListItemIcon>
        <ListItemText primary={t("overview.title")} />
      </ListItemLink>
      {user.privileges.includes("cashier_management") && (
        <ListItemLink to="/cashiers">
          <ListItemIcon>
            <PersonIcon />
          </ListItemIcon>
          <ListItemText primary={t("cashiers")} />
        </ListItemLink>
      )}
      {user.privileges.includes("product_management") && (
        <>
          <ListItemLink to="/products">
            <ListItemIcon>
              <ShoppingCartIcon />
            </ListItemIcon>
            <ListItemText primary={t("products")} />
          </ListItemLink>
          <ListItemLink to="/tickets">
            <ListItemIcon>
              <ConfirmationNumberIcon />
            </ListItemIcon>
            <ListItemText primary={t("tickets")} />
          </ListItemLink>
        </>
      )}
      {user.privileges.includes("till_management") && (
        <>
          <ListItemLink to="/till-buttons">
            <ListItemIcon>
              <PointOfSaleIcon />
            </ListItemIcon>
            <ListItemText primary={t("tillButtons")} />
          </ListItemLink>
          <ListItemLink to="/till-layouts">
            <ListItemIcon>
              <PointOfSaleIcon />
            </ListItemIcon>
            <ListItemText primary={t("tillLayouts")} />
          </ListItemLink>
          <ListItemLink to="/till-profiles">
            <ListItemIcon>
              <PointOfSaleIcon />
            </ListItemIcon>
            <ListItemText primary={t("tillProfiles")} />
          </ListItemLink>
          <ListItemLink to="/tills">
            <ListItemIcon>
              <PointOfSaleIcon />
            </ListItemIcon>
            <ListItemText primary={t("tills")} />
          </ListItemLink>
          <ListItemLink to="/till-register-stockings">
            <ListItemIcon>
              <PointOfSaleIcon />
            </ListItemIcon>
            <ListItemText primary={t("registerStockings")} />
          </ListItemLink>
          <ListItemLink to="/till-registers">
            <ListItemIcon>
              <PointOfSaleIcon />
            </ListItemIcon>
            <ListItemText primary={t("registers")} />
          </ListItemLink>
        </>
      )}
      {user.privileges.includes("account_management") && (
        <ExpandableLinkMenu label={t("accounts")}>
          <List sx={{ pl: 2 }}>
            <ListItemLink to="/find-accounts">
              <ListItemIcon>
                <SearchIcon />
              </ListItemIcon>
              <ListItemText primary={t("findAccounts")} />
            </ListItemLink>
            <ListItemLink to="/overview/money">
              <ListItemIcon>
                <MoneyIcon />
              </ListItemIcon>
              <ListItemText primary={t("moneyOverview")} />
            </ListItemLink>
            <ListItemLink to="/system-accounts">
              <ListItemIcon>
                <AccountBalanceIcon />
              </ListItemIcon>
              <ListItemText primary={t("systemAccounts")} />
            </ListItemLink>
          </List>
        </ExpandableLinkMenu>
      )}
      {user.privileges.includes("order_management") && (
        <ListItemLink to="/orders">
          <ListItemIcon>
            <AddShoppingCartIcon />
          </ListItemIcon>
          <ListItemText primary={t("orders")} />
        </ListItemLink>
      )}
      <AdvancedMenu user={user} />
    </List>
  );
};
