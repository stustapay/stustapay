import { InfoOutlined as InfoOutlinedIcon } from "@mui/icons-material";
import { Box, Button, Dialog, DialogActions, DialogContent, IconButton } from "@mui/material";
import { EventPrivilege, NodePrivilege } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { usePrivilegeTranslations } from "@/hooks";

import { PrivilegeList } from "./PrivilegeList";

export type PrivilegeOverviewCellProps = {
  eventPrivileges: readonly EventPrivilege[];
  nodePrivileges: readonly NodePrivilege[];
};

export const PrivilegeOverviewCell: React.FC<PrivilegeOverviewCellProps> = ({ eventPrivileges, nodePrivileges }) => {
  const { t } = useTranslation();
  const { getPrivilegeName } = usePrivilegeTranslations();
  const [open, setOpen] = React.useState(false);

  const allPrivileges = [...eventPrivileges, ...nodePrivileges];
  const summary =
    allPrivileges.length === 0 ? t("privilege.noneAssigned") : allPrivileges.map(getPrivilegeName).join(", ");

  const handleOpen = (event: React.MouseEvent) => {
    event.stopPropagation();
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", width: "100%" }} onClick={handleOpen}>
        <IconButton size="small" color="info" aria-label={t("userRole.privileges")}>
          <InfoOutlinedIcon fontSize="small" />
        </IconButton>
        <Box
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {summary}
        </Box>
      </Box>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogContent dividers>
          <PrivilegeList title={t("userRole.eventPrivileges")} privileges={eventPrivileges} />
          <PrivilegeList title={t("userRole.nodePrivileges")} privileges={nodePrivileges} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>{t("cancel")}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
