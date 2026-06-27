import { Accordion, AccordionDetails, AccordionSummary, Typography } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import * as React from "react";

export type CollapsibleStatsPanelProps = {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
};

export const CollapsibleStatsPanel: React.FC<CollapsibleStatsPanelProps> = ({
  title,
  defaultExpanded = true,
  children,
}) => {
  return (
    <Accordion defaultExpanded={defaultExpanded}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls={`${title}-content`} id={`${title}-header`}>
        <Typography variant="h5">{title}</Typography>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
};
