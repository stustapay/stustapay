import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, Button, LinearProgress, Paper, Tab, Typography } from "@mui/material";
import { Loading } from "@stustapay/components";
import { FormTextField } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Transaction } from "@tanstack/db";
import { useLiveQuery } from "@tanstack/react-db";
import { Form, Formik, FormikHelpers } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { TillLayoutRoutes } from "@/app/routes";
import { NewTillLayout } from "@/db/api/generated";
import { getTicketCollection, getTillButtonCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { TillLayoutDesigner } from "./TillLayoutDesigner";

export interface TillChangeProps<T extends NewTillLayout> {
  headerTitle: string;
  submitLabel: string;
  initialValues: T;
  validationSchema: z.ZodSchema<T>;
  onSubmit: (t: T) => Transaction<any>;
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

  const { data: buttons, isLoading: isButtonsLoading } = useLiveQuery(
    (q) => q.from({ buttons: getTillButtonCollection(currentNode.id) }),
    [currentNode.id]
  );
  const { data: tickets, isLoading: isTicketsLoading } = useLiveQuery(
    (q) => q.from({ tickets: getTicketCollection(currentNode.id) }),
    [currentNode.id]
  );

  const [selectedTab, setSelectedTab] = React.useState<"buttons" | "tickets">("buttons");

  if (isButtonsLoading || isTicketsLoading || !tickets || !buttons) {
    return <Loading />;
  }

  const handleSubmit = (values: T, { setSubmitting }: FormikHelpers<T>) => {
    setSubmitting(true);

    const transaction = onSubmit(values);
    transaction.isPersisted.promise
      .then(() => {
        setSubmitting(false);
        navigate(TillLayoutRoutes.list());
      })
      .catch((err: unknown) => {
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
                <TabList onChange={(_, val) => setSelectedTab(val as "buttons" | "tickets")}>
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
                  selectables={tickets.map((ticket) => ({
                    id: ticket.id,
                    name: ticket.name,
                    price: ticket.total_price,
                  }))}
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
