import { Box, BoxProps } from "@mui/material";
import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export interface MarkdownContentProps extends Omit<BoxProps, "children"> {
  value: string;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ value, sx, ...boxProps }) => {
  return (
    <Box
      sx={{
        "& > *:first-of-type": {
          mt: 0,
        },
        "& > *:last-child": {
          mb: 0,
        },
        "& a": {
          color: "primary.main",
        },
        "& ul, & ol": {
          pl: 3,
        },
        ...sx,
      }}
      {...boxProps}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
    </Box>
  );
};
