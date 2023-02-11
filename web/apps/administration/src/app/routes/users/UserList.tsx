import * as React from "react";
import {
  Paper,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  IconButton,
  Typography,
  ListItem,
  ListItemText,
} from "@mui/material";
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { useDeleteUserMutation, useGetUsersQuery } from "@api";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { IconButtonLink } from "@components/IconButtonLink";

export const UserList: React.FC = () => {
  const { t } = useTranslation(["users", "common"]);
  const navigate = useNavigate();

  const { data: users, isLoading } = useGetUsersQuery();
  const [deleteUser] = useDeleteUserMutation();

  if (isLoading) {
    return (
      <Paper>
        <CircularProgress />
      </Paper>
    );
  }

  const addUser = () => {
    navigate("/users/new");
  };

  return (
    <>
      <Paper>
        <ListItem
          secondaryAction={
            <Button onClick={addUser} endIcon={<AddIcon />} variant="contained" color="primary">
              {t("add", { ns: "common" })}
            </Button>
          }
        >
          <ListItemText primary={t("users", { ns: "common" })} />
        </ListItem>
        <Typography variant="body1">{}</Typography>
      </Paper>
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table sx={{ minWidth: 650 }} aria-label="users">
          <TableHead>
            <TableRow>
              <TableCell>{t("userName")}</TableCell>
              <TableCell>{t("userDescription")}</TableCell>
              <TableCell>{t("userPrivileges")}</TableCell>
              <TableCell align="right">{t("actions", { ns: "common" })}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(users ?? []).map((user) => (
              <TableRow key={user.name}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.description}</TableCell>
                <TableCell>{user.privileges}</TableCell>
                <TableCell align="right">
                  <IconButtonLink to={`/users/${user.id}/edit`} color="primary">
                    <EditIcon />
                  </IconButtonLink>
                  <IconButton color="error" onClick={() => deleteUser(user.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};
