import { Paper, Typography, Box, Grid } from "@mui/material";
import React from "react";

interface PageContainerProps {
    title: string;
    children: React.ReactNode;
    maxWidth?: "xs" | "sm" | "md" | "lg" | "xl";
}

export const PageContainer: React.FC<PageContainerProps> = ({ title, children, maxWidth = "md" }) => {
    return (
        <Grid container justifyContent="center" sx={{ mt: 4, mb: 4 }}>
            <Grid
                size={{ xs: 12, sm: 10, md: 8, lg: maxWidth === "lg" ? 10 : 8, xl: maxWidth === "xl" ? 10 : 8 }}
            >
                <Paper
                    className="glass-card"
                    sx={{
                        width: "100%",
                        borderRadius: 4,
                        overflow: "hidden",
                        background: "var(--glass-bg)",
                        backdropFilter: "blur(10px)",
                        border: "var(--border-glass)",
                        boxShadow: "var(--shadow-soft)",
                    }}
                >
                    <Box
                        sx={{
                            background: "var(--primary-gradient)",
                            color: "var(--portal-font-color)",
                            py: 4,
                            px: 2,
                            position: "relative",
                            overflow: "hidden",
                            "&::before": {
                                content: '""',
                                position: "absolute",
                                top: "-50%",
                                right: "-50%",
                                width: "100%",
                                height: "100%",
                                background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
                                pointerEvents: "none",
                            },
                        }}
                    >
                        <Typography
                            variant="h3"
                            component="h1"
                            align="center"
                            sx={{
                                fontWeight: "bold",
                                color: "inherit",
                                textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                                    width: "100%",
                                    // Prevent cutting/overflow of long single "words" on small screens
                                    // (e.g. "Datenschutzerklärung" without spaces).
                                    whiteSpace: "normal",
                                    overflowWrap: "anywhere",
                                    wordBreak: "break-word",
                                    lineHeight: { xs: 1.1, sm: 1.2 },
                                    fontSize: { xs: "1.65rem" },
                            }}
                        >
                            {title}
                        </Typography>
                    </Box>
                    <Box sx={{ p: { xs: 3, sm: 5 } }}>
                        {children}
                    </Box>
                </Paper>
            </Grid>
        </Grid>
    );
};
