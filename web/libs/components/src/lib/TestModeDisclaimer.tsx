import { Alert, AlertTitle } from "@mui/material";
import * as React from "react";

export interface TestModeDisclaimerProps {
  testMode: boolean;
  testModeMessage: string;
}

export const TestModeDisclaimer: React.FC<TestModeDisclaimerProps> = ({ testMode, testModeMessage }) => {
  if (!testMode) {
    return null;
  }

  return (
    <Alert severity="error" sx={{ mb: 2 }}>
      <AlertTitle>This instance is running in TEST mode</AlertTitle>
      {testModeMessage}
    </Alert>
  );
};
