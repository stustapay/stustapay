import { Link, Typography } from "@mui/material";
import { DataGrid, GridColDef } from "@stustapay/framework";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

import { UserRole, UserRoleAssignment, useListUserRoleAssignmentsQuery } from "@/api";
import { UserRoleRoutes } from "@/app/routes";
import { useCurrentNode } from "@/hooks";

const renderRoles = (roles: UserRole[]) => {
  const sortedRoles = roles.toSorted((lhs, rhs) => lhs.name.toLowerCase().localeCompare(rhs.name.toLowerCase()));

  return (
    <div>
      {sortedRoles.map((role, index) => (
        <React.Fragment key={role.id}>
          {index > 0 ? ", " : null}
          <Link component={RouterLink} to={UserRoleRoutes.detail(role.id, role.node_id)}>
            {role.name}
          </Link>
        </React.Fragment>
      ))}
    </div>
  );
};

export const UserRoleAssignmentsSection: React.FC<{ userId: number }> = ({ userId }) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const { data: assignments, isLoading } = useListUserRoleAssignmentsQuery({
    nodeId: currentNode.id,
    userId,
  });

  const columns: GridColDef<UserRoleAssignment>[] = [
    {
      field: "node_name",
      headerName: t("common.definedAtNode"),
      flex: 1,
      minWidth: 150,
    },
    {
      field: "roles",
      headerName: t("userToRole.role"),
      flex: 2,
      sortable: false,
      valueGetter: (_, row) => row.roles.map((role) => role.name).join(", "),
      renderCell: (params) => renderRoles(params.row.roles),
    },
  ];

  return (
    <>
      <Typography variant="body1" sx={{ p: 1 }}>
        {t("user.roleAssignments")}
      </Typography>
      <DataGrid
        autoHeight
        loading={isLoading}
        getRowId={(row) => row.node_id}
        rows={assignments ?? []}
        columns={columns}
        disableRowSelectionOnClick
        initialState={{
          sorting: {
            sortModel: [{ field: "node_name", sort: "asc" }],
          },
        }}
        localeText={{
          noRowsLabel: t("user.noRoleAssignments"),
        }}
      />
    </>
  );
};
