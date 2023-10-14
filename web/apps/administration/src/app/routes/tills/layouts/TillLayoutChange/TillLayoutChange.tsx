import {
  NewTillLayout,
  selectTicketAll,
  selectTillButtonAll,
  useListTicketsQuery,
  useListTillButtonsQuery,
} from "@/api";
import { TillLayoutRoutes } from "@/app/routes";
import { useCurrentNode } from "@/hooks";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, Button, LinearProgress, Paper, Tab, Typography } from "@mui/material";
import { MutationActionCreatorResult } from "@reduxjs/toolkit/dist/query/core/buildInitiate";
import { Loading } from "@stustapay/components";
import { FormTextField } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { TillLayoutDesigner } from "./TillLayoutDesigner";

export interface TillChangeProps<T extends NewTillLayout> {
  headerTitle: string;
  submitLabel: string;
  initialValues: T;
  validationSchema: z.ZodSchema<T>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSubmit: (t: T) => MutationActionCreatorResult<any>;
}

export function TillLayoutChange<T extends NewTillLayout>({
  headerTitle,
  submitLabel,
  initialValues,
  validationSchema,
  onSubmit,
}: TillChangeProps<T>) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  const { buttons } = useListTillButtonsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        buttons: data ? selectTillButtonAll(data) : undefined,
      }),
    }
  );
  const { tickets } = useListTicketsQuery(
    { nodeId: currentNode.id },
    {
      selectFromResult: ({ data, ...rest }) => ({
        ...rest,
        tickets: data ? selectTicketAll(data) : undefined,
      }),
    }
  );

  const [selectedTab, setSelectedTab] = React.useState<"buttons" | "tickets">("buttons");

  if (!tickets || !buttons) {
    return <Loading />;
  }

  const handleSubmit = (values: T, { setSubmitting }: FormikHelpers<T>) => {
    setSubmitting(true);

    onSubmit(values)
      .unwrap()
      .then(() => {
        setSubmitting(false);
        navigate(TillLayoutRoutes.list());
      })
      .catch((err) => {
        setSubmitting(false);
        console.warn("error in till update", err);
      });
  };

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={toFormikValidationSchema(validationSchema)}
    >
      {(formik) => (
        <Form onSubmit={formik.handleSubmit}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5">{headerTitle}</Typography>
            <FormTextField autoFocus name="name" label={t("layout.name")} formik={formik} />
            <FormTextField name="description" label={t("layout.description")} formik={formik} />
          </Paper>
          <Paper sx={{ mt: 2 }}>
            <TabContext value={selectedTab}>
              <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                <TabList onChange={(evt, val) => setSelectedTab(val as any)}>
                  <Tab value="buttons" label={t("layout.buttons")} />
                  <Tab value="tickets" label={t("layout.tickets")} />
                </TabList>
              </Box>
              <TabPanel value="buttons">
                <TillLayoutDesigner
                  selectedIds={formik.values.button_ids == null ? [] : formik.values.button_ids}
                  onChange={(buttonIds) => formik.setFieldValue("button_ids", buttonIds)}
                  selectables={buttons}
                />
              </TabPanel>
              <TabPanel value="tickets">
                <TillLayoutDesigner
                  selectedIds={formik.values.ticket_ids == null ? [] : formik.values.ticket_ids}
                  onChange={(ticketIds) => formik.setFieldValue("ticket_ids", ticketIds)}
                  selectables={tickets.map((t) => ({ id: t.id, name: t.name, price: t.total_price }))}
                />
              </TabPanel>
            </TabContext>
          </Paper>
          <Paper sx={{ mt: 2, p: 2 }}>
            {formik.isSubmitting && <LinearProgress />}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              disabled={formik.isSubmitting}
              sx={{ mt: 1 }}
            >
              {submitLabel}
            </Button>
          </Paper>
        </Form>
      )}
    </Formik>
  );
}
