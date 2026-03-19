import { findNode, useNodeTree } from "@/api";
import { HelpRoutes } from "@/app/routes";
import { MarkdownContent } from "@/components/MarkdownContent";
import { selectSelectedNodes, useAppSelector } from "@/store";
import {
  Alert,
  Box,
  Button,
  Divider,
  List,
  ListItem,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { getHelpContent } from "./content";
import { resolveHelpContextNodeId } from "./context";
import { HelpLink } from "./types";

const getResolvedLink = (link: HelpLink, currentNodeId: number | null, eventNodeId: number | null): string | null => {
  if (link.to) {
    return link.to;
  }

  const targetNodeId = link.context === "event" ? eventNodeId : currentNodeId;

  if (targetNodeId != null && link.buildTo) {
    return link.buildTo(targetNodeId);
  }

  return null;
};

export const HelpPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { root } = useNodeTree();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedNode = useAppSelector(selectSelectedNodes);

  const nodeId = React.useMemo(
    () =>
      resolveHelpContextNodeId({
        pathname: location.pathname,
        selectedNode,
        queryNodeId: searchParams.get("nodeId"),
      }),
    [location.pathname, searchParams, selectedNode]
  );
  const contextNode = React.useMemo(() => (nodeId != null ? findNode(nodeId, root) : undefined), [nodeId, root]);
  const eventNodeId = contextNode?.event != null ? contextNode.id : contextNode?.event_node_id ?? null;
  const content = React.useMemo(() => getHelpContent(i18n.resolvedLanguage ?? i18n.language), [i18n.language, i18n.resolvedLanguage]);

  const handleScrollToSection = React.useCallback((sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(window.history.state, "", `${location.pathname}${location.search}#${sectionId}`);
  }, [location.pathname, location.search]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" gutterBottom>
          {t("help.title")}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t("help.intro")}
        </Typography>
      </Box>

      <Alert severity="info">
        {contextNode
          ? t("help.currentContext", { node: t(contextNode.name), guideUrl: HelpRoutes.index(contextNode.id) })
          : t("help.selectNodeHint")}
      </Alert>

      <Box
        sx={{
          display: "grid",
          gap: 3,
          alignItems: "start",
          gridTemplateColumns: {
            xs: "1fr",
            md: "280px minmax(0, 1fr)",
          },
        }}
      >
        <Paper sx={{ p: 2, position: { md: "sticky" }, top: { md: 96 } }}>
          <Typography variant="h6" gutterBottom>
            {t("help.contents")}
          </Typography>
          <List dense disablePadding>
            {content.sections.map((section) => (
              <ListItem key={section.id} disablePadding>
                <Button
                  variant="text"
                  onClick={() => handleScrollToSection(section.id)}
                  sx={{ justifyContent: "flex-start", px: 0, textAlign: "left" }}
                >
                  {section.title}
                </Button>
              </ListItem>
            ))}
          </List>
        </Paper>

        <Stack spacing={3}>
          {content.sections.map((section) => (
            <Paper key={section.id} id={section.id} sx={{ p: { xs: 2, md: 3 }, scrollMarginTop: 96 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h5" gutterBottom>
                    {section.title}
                  </Typography>
                  {section.summary ? (
                    <Typography variant="body1" color="text.secondary">
                      {section.summary}
                    </Typography>
                  ) : null}
                </Box>
                <MarkdownContent value={section.body} />
                <Divider />
                <Stack spacing={1.5}>
                  <Typography variant="subtitle1">{t("help.relatedLinks")}</Typography>
                  {section.links.map((link) => {
                    const resolvedLink = getResolvedLink(link, contextNode?.id ?? nodeId ?? null, eventNodeId);
                    const disabled = resolvedLink == null && link.requiresNodeContext;

                    return (
                      <Box key={`${section.id}-${link.label}`}>
                        {resolvedLink ? (
                          <Button
                            variant="outlined"
                            sx={{ justifyContent: "flex-start" }}
                            onClick={() => navigate(resolvedLink)}
                          >
                            {link.label}
                          </Button>
                        ) : (
                          <Button variant="outlined" disabled sx={{ justifyContent: "flex-start" }}>
                            {link.label}
                          </Button>
                        )}
                        {link.description ? (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {link.description}
                          </Typography>
                        ) : null}
                        {disabled ? (
                          <Typography variant="caption" color="text.secondary">
                            {t("help.requiresNodeContext")}
                          </Typography>
                        ) : null}
                      </Box>
                    );
                  })}
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
};
