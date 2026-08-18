import { config } from "@/api/common";
import { LanguageSelect } from "@/components";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import { Menu as MenuIcon } from "@mui/icons-material";
import { AppBar, Box, Button, Container, IconButton, Menu, MenuItem, Toolbar, Typography } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";

interface AppHeaderProps {
    authenticated: boolean;
    onLogout?: () => void;
    navbarLinks?: { label: string; link: string }[];
}

export const AppHeader: React.FC<AppHeaderProps> = ({ authenticated, onLogout, navbarLinks = [] }) => {
    const { t } = useTranslation();
    const publicConfig = usePublicConfig();
    const [anchorElNav, setAnchorElNav] = React.useState<null | HTMLElement>(null);

    const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorElNav(event.currentTarget);
    };

    const handleCloseNavMenu = () => {
        setAnchorElNav(null);
    };

    return (
        <>
            <AppBar
                position="fixed"
                sx={{
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    background: "var(--primary-gradient)",
                    color: "var(--portal-font-color)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                }}
            >
                <Container maxWidth="xl">
                    <Toolbar disableGutters sx={{ minHeight: { xs: 56, sm: 64 } }}>
                        {/* Mobile menu icon */}
                        <Box sx={{ display: { xs: "flex", md: "none" }, mr: 1 }}>
                            <IconButton
                                size="small"
                                aria-label="menu"
                                aria-controls="menu-appbar"
                                aria-haspopup="true"
                                onClick={handleOpenNavMenu}
                                color="inherit"
                            >
                                <MenuIcon />
                            </IconButton>
                            <Menu
                                id="menu-appbar"
                                anchorEl={anchorElNav}
                                anchorOrigin={{
                                    vertical: "bottom",
                                    horizontal: "left",
                                }}
                                keepMounted
                                transformOrigin={{
                                    vertical: "top",
                                    horizontal: "left",
                                }}
                                open={Boolean(anchorElNav)}
                                onClose={handleCloseNavMenu}
                                sx={{
                                    display: { xs: "block", md: "none" },
                                }}
                            >
                                {navbarLinks.map((link) => (
                                    <MenuItem key={link.link} component={RouterLink} to={link.link} onClick={handleCloseNavMenu}>
                                        {link.label}
                                    </MenuItem>
                                ))}
                                {!authenticated && (
                                    <MenuItem component={RouterLink} to="/login" onClick={handleCloseNavMenu}>
                                        {t("login")}
                                    </MenuItem>
                                )}
                            </Menu>
                        </Box>

                        {/* Event name - desktop */}
                        <Typography
                            variant="h6"
                            component="div"
                            noWrap
                            sx={{
                                mr: 4,
                                display: { xs: "none", md: "flex" },
                                fontWeight: 700,
                                textDecoration: "none",
                                maxWidth: { md: "300px", lg: "400px" },
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            <RouterLink
                                to="/"
                                style={{
                                    textDecoration: "none",
                                    color: "inherit",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {t(config.apiConfig.event_name)}
                            </RouterLink>
                        </Typography>

                        {/* Event name - mobile */}
                        <Typography
                            variant="body1"
                            component="div"
                            noWrap
                            sx={{
                                display: { xs: "flex", md: "none" },
                                flexGrow: 1,
                                fontWeight: 600,
                                fontSize: "1rem",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                mr: 1,
                            }}
                        >
                            <RouterLink
                                to="/"
                                style={{
                                    textDecoration: "none",
                                    color: "inherit",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {t(config.apiConfig.event_name)}
                            </RouterLink>
                        </Typography>

                        {/* Desktop navigation links */}
                        <Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" }, gap: 1 }}>
                            {navbarLinks.map((link) => (
                                <Button
                                    key={link.link}
                                    onClick={handleCloseNavMenu}
                                    component={RouterLink}
                                    color="inherit"
                                    to={link.link}
                                    size="small"
                                >
                                    {link.label}
                                </Button>
                            ))}
                        </Box>

                        {/* Language select and auth buttons */}
                        <Box sx={{ display: "flex", gap: { xs: 0.5, sm: 1 }, alignItems: "center" }}>
                            <LanguageSelect
                                sx={{
                                    color: "inherit",
                                    "& .MuiOutlinedInput-notchedOutline": {
                                        borderColor: "rgba(255, 255, 255, 0.5)",
                                    },
                                    "& .MuiSelect-select": {
                                        padding: { xs: "4px 8px", sm: "8px 12px" },
                                        fontSize: { xs: "0.875rem", sm: "1rem" },
                                    },
                                }}
                                variant="outlined"
                            />
                            {authenticated ? (
                                <Button
                                    color="inherit"
                                    onClick={onLogout}
                                    size="small"
                                    sx={{
                                        fontSize: { xs: "0.875rem", sm: "1rem" },
                                        padding: { xs: "4px 8px", sm: "6px 16px" },
                                        minWidth: { xs: "auto", sm: "64px" },
                                    }}
                                >
                                    {t("logout")}
                                </Button>
                            ) : (
                                <Button
                                    component={RouterLink}
                                    color="inherit"
                                    to="/login"
                                    size="small"
                                    sx={{
                                        fontSize: { xs: "0.875rem", sm: "1rem" },
                                        padding: { xs: "4px 8px", sm: "6px 16px" },
                                        minWidth: { xs: "auto", sm: "64px" },
                                    }}
                                >
                                    {t("login")}
                                </Button>
                            )}
                        </Box>
                    </Toolbar>
                </Container>
            </AppBar>

            {/* Spacer to prevent content from being hidden under fixed AppBar */}
            <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }} />

            {/* Event Banner */}
            {publicConfig.banner_image_url && (
                <Box
                    sx={{
                        width: "100%",
                        height: { xs: 120, sm: 180, md: 220 },
                        backgroundImage: `url(${publicConfig.banner_image_url})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        mb: 2,
                    }}
                />
            )}
        </>
    );
};
