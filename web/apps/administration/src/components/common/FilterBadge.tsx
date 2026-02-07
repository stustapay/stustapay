import * as React from "react";
import { Chip, IconButton, useTheme, useMediaQuery } from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { Fade } from "@mui/material";
import { useTranslation } from "react-i18next";

export type FilterBadgeProps = {
  label: string;
  value: string;
  onClear: () => void;
  visible?: boolean;
};

export const FilterBadge: React.FC<FilterBadgeProps> = ({ label, value, onClear, visible = true }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Fade in={visible} timeout={300}>
      <Chip
        label={
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: isMobile ? "150px" : "none" }}>
            <strong>{label}:</strong> {value}
          </span>
        }
        onDelete={onClear}
        deleteIcon={
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            sx={{
              minWidth: "32px",
              minHeight: "32px",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
              },
            }}
          >
            <CloseIcon sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }} />
          </IconButton>
        }
        sx={{
          backgroundColor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(115, 191, 105, 0.2)" : "rgba(115, 191, 105, 0.1)",
          color: (theme) => (theme.palette.mode === "dark" ? "#73BF69" : "#4a8a3e"),
          border: (theme) =>
            theme.palette.mode === "dark"
              ? "1px solid rgba(115, 191, 105, 0.3)"
              : "1px solid rgba(115, 191, 105, 0.2)",
          fontWeight: 500,
          fontSize: { xs: "0.7rem", sm: "0.75rem" },
          height: { xs: "32px", sm: "28px" },
          maxWidth: { xs: "100%", sm: "none" },
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            backgroundColor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(115, 191, 105, 0.3)" : "rgba(115, 191, 105, 0.15)",
            transform: "scale(1.05)",
          },
          "& .MuiChip-deleteIcon": {
            color: "inherit",
            fontSize: { xs: "0.9rem", sm: "1rem" },
          },
          "& .MuiChip-label": {
            padding: { xs: "0 8px", sm: "0 12px" },
            overflow: "hidden",
            textOverflow: "ellipsis",
          },
        }}
      />
    </Fade>
  );
};
