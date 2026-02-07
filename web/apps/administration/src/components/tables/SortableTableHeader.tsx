import * as React from "react";
import { TableCell, TableSortLabel, useTheme, useMediaQuery } from "@mui/material";
import { ArrowUpward, ArrowDownward } from "@mui/icons-material";

export type SortableTableHeaderProps = {
  field: string;
  label: string;
  sortField?: string;
  sortDirection?: "asc" | "desc";
  onSort: (field: string) => void;
  align?: "left" | "right" | "center";
  sx?: any;
};

export const SortableTableHeader: React.FC<SortableTableHeaderProps> = ({
  field,
  label,
  sortField,
  sortDirection,
  onSort,
  align = "left",
  sx,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isActive = sortField === field;

  return (
    <TableCell
      align={align}
      sx={{
        fontSize: { xs: "0.65rem", sm: "0.75rem" },
        fontWeight: 600,
        textTransform: "uppercase",
        color: "text.secondary",
        py: { xs: 0.75, sm: 1 },
        px: { xs: 0.75, sm: 1.5 },
        cursor: "pointer",
        userSelect: "none",
        transition: "all 0.2s ease-in-out",
        minHeight: { xs: "44px", sm: "auto" },
        "&:hover": {
          backgroundColor: "rgba(255, 255, 255, 0.03)",
        },
        ...sx,
      }}
      onClick={() => onSort(field)}
    >
      <TableSortLabel
        active={isActive}
        direction={isActive ? sortDirection : "asc"}
        IconComponent={() => {
          if (!isActive) {
            return (
              <ArrowUpward
                sx={{
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  opacity: 0.3,
                  transition: "opacity 0.2s ease-in-out",
                  "&:hover": {
                    opacity: 0.6,
                  },
                }}
              />
            );
          }
          return sortDirection === "asc" ? (
            <ArrowUpward sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" }, color: "#73BF69" }} />
          ) : (
            <ArrowDownward sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" }, color: "#73BF69" }} />
          );
        }}
        sx={{
          "& .MuiTableSortLabel-icon": {
            color: isActive ? "#73BF69 !important" : "rgba(255, 255, 255, 0.3) !important",
          },
          "&:hover": {
            color: "#73BF69",
            "& .MuiTableSortLabel-icon": {
              opacity: 0.8,
            },
          },
        }}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );
};
