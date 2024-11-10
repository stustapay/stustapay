import { Container, Stack, Typography } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import StuStaPayLogo from "../favicon.svg";

export const ConfigLoadErrorPage: React.FC = () => {
  const { t } = useTranslation("translations", { keyPrefix: "errorPage" });
  return (
    <Container>
      <Stack justifyContent="center" alignItems="center" spacing={3} marginTop={8}>
        <img
          src={StuStaPayLogo}
          alt="StuStaPay logo"
          style={{ width: "100%", height: "100%", maxWidth: "200px", minHeight: "200px" }}
        />
        <Typography fontSize={34} textAlign="center">
          {t("error")}
        </Typography>
        <Typography fontSize={24} textAlign="center">
          {t("currentlyUnavailable")}
        </Typography>
      </Stack>
    </Container>
  );
};
