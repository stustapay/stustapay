import * as React from "react";
import {
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  InputAdornment,
  Chip,
  Box,
  Fade,
} from "@mui/material";
import { Search as SearchIcon, Clear as ClearIcon, FilterList as FilterListIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";

export type ColumnFilterConfig = {
  field: string;
  label: string;
  type: "text" | "select" | "number";
  options?: { value: any; label: string }[];
};

export type TableFilterBarProps = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  columnFilters?: ColumnFilterConfig[];
  activeColumnFilters?: Map<string, any>;
  onColumnFilterChange?: (field: string, value: any) => void;
  onClearColumnFilter?: (field: string) => void;
  onClearAll?: () => void;
};

export const TableFilterBar: React.FC<TableFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  columnFilters = [],
  activeColumnFilters = new Map(),
  onColumnFilterChange,
  onClearColumnFilter,
  onClearAll,
}) => {
  const { t } = useTranslation();
  const hasActiveFilters = searchQuery.trim().length > 0 || activeColumnFilters.size > 0;

  return (
    <Stack spacing={{ xs: 1.5, sm: 2 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 1.5, sm: 2 }}
        alignItems={{ xs: "stretch", sm: "center" }}
      >
        <TextField
          size="small"
          placeholder={searchPlaceholder || t("overview.search")}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: "1.2rem", color: "text.secondary" }} />
              </InputAdornment>
            ),
            endAdornment: searchQuery ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => onSearchChange("")}
                  sx={{
                    p: 0.5,
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.1)",
                      transform: "scale(1.1)",
                    },
                  }}
                >
                  <ClearIcon sx={{ fontSize: "1rem" }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{
            flex: 1,
            minWidth: { xs: "100%", sm: 200 },
            transition: "all 0.2s ease-in-out",
            "& .MuiOutlinedInput-root": {
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                borderColor: "#73BF69",
              },
              "&.Mui-focused": {
                borderColor: "#73BF69",
              },
            },
          }}
        />

        {columnFilters.map((filter) => (
          <FormControl
            key={filter.field}
            size="small"
            sx={{
              minWidth: { xs: "100%", sm: 150 },
              transition: "all 0.2s ease-in-out",
            }}
          >
            <InputLabel id={`filter-${filter.field}-label`}>{filter.label}</InputLabel>
            {filter.type === "select" && filter.options ? (
              <Select
                labelId={`filter-${filter.field}-label`}
                id={`filter-${filter.field}`}
                value={activeColumnFilters.get(filter.field) || ""}
                label={filter.label}
                onChange={(e) => {
                  const value = e.target.value === "" ? null : e.target.value;
                  onColumnFilterChange?.(filter.field, value);
                }}
                sx={{
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    borderColor: "#73BF69",
                  },
                }}
              >
                <MenuItem value="">
                  <em>{t("overview.all")}</em>
                </MenuItem>
                {filter.options.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            ) : filter.type === "text" ? (
              <TextField
                size="small"
                label={filter.label}
                value={activeColumnFilters.get(filter.field) || ""}
                onChange={(e) =>
                  onColumnFilterChange?.(filter.field, e.target.value === "" ? null : e.target.value)
                }
                InputProps={{
                  endAdornment: activeColumnFilters.get(filter.field) ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => onClearColumnFilter?.(filter.field)}
                        sx={{ p: 0.5 }}
                      >
                        <ClearIcon sx={{ fontSize: "1rem" }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />
            ) : null}
          </FormControl>
        ))}

        {hasActiveFilters && onClearAll && (
          <IconButton
            size="small"
            onClick={onClearAll}
            sx={{
              minWidth: { xs: "100%", sm: "auto" },
              minHeight: { xs: "44px", sm: "auto" },
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                transform: "scale(1.1)",
              },
            }}
            title={t("overview.clearAllFilters")}
          >
            <FilterListIcon />
          </IconButton>
        )}
      </Stack>

      {hasActiveFilters && (
        <Fade in={hasActiveFilters} timeout={300}>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: { xs: 0.75, sm: 1 },
              alignItems: "center",
            }}
          >
            {searchQuery.trim() && (
              <Chip
                label={`${t("overview.search")}: "${searchQuery}"`}
                onDelete={() => onSearchChange("")}
                size="small"
                sx={{
                  backgroundColor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(115, 191, 105, 0.2)" : "rgba(115, 191, 105, 0.1)",
                  color: (theme) => (theme.palette.mode === "dark" ? "#73BF69" : "#4a8a3e"),
                  fontSize: { xs: "0.7rem", sm: "0.75rem" },
                  height: { xs: "28px", sm: "auto" },
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    transform: "scale(1.05)",
                  },
                }}
              />
            )}
            {Array.from(activeColumnFilters.entries()).map(([field, value]) => {
              const filterConfig = columnFilters.find((f) => f.field === field);
              if (!filterConfig || !value) return null;
              return (
                <Chip
                  key={field}
                  label={`${filterConfig.label}: ${filterConfig.type === "select" && filterConfig.options
                    ? filterConfig.options.find((o) => o.value === value)?.label || value
                    : value}`}
                  onDelete={() => onClearColumnFilter?.(field)}
                  size="small"
                  sx={{
                    backgroundColor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(115, 191, 105, 0.2)" : "rgba(115, 191, 105, 0.1)",
                    color: (theme) => (theme.palette.mode === "dark" ? "#73BF69" : "#4a8a3e"),
                    fontSize: { xs: "0.7rem", sm: "0.75rem" },
                    height: { xs: "28px", sm: "auto" },
                    maxWidth: { xs: "100%", sm: "none" },
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                      transform: "scale(1.05)",
                    },
                  }}
                />
              );
            })}
          </Box>
        </Fade>
      )}
    </Stack>
  );
};
