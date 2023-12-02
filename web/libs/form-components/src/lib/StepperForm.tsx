import { Box, Button, Divider, Stack, Step, StepButton, Stepper } from "@mui/material";
import { toFormikValidationSchema } from "@stustapay/utils";
import { FormikProps, Formik, FormikHelpers, Form } from "formik";
import * as React from "react";
import { z } from "zod";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormStep<T = any> = {
  title: string;
  initialValues: T;
  schema: z.ZodSchema<T>;
  form: React.FC<FormikProps<T>>;
};

export type StepperFormProps<T, S> = {
  onSubmit: (values: T) => Promise<void>;
  steps: S;
};

export function StepperForm<T extends object, S extends readonly FormStep[]>({
  steps,
  onSubmit,
}: StepperFormProps<T, S>) {
  const [activeStep, setActiveStep] = React.useState(0);

  const initialValues = React.useMemo<T>(() => {
    return steps.reduce(
      (agg, { initialValues }) => ({
        ...agg,
        ...initialValues,
      }),
      {}
    ) as T;
  }, [steps]);

  const isLastStep = () => {
    return activeStep === steps.length - 1;
  };

  const handlePrev = () => {
    setActiveStep(Math.max(activeStep - 1, 0));
  };

  const handleNext = () => {
    setActiveStep(Math.min(activeStep + 1, steps.length - 1));
  };

  const handleStep = (index: number) => {
    setActiveStep(index);
  };

  const handleSubmit = (values: T, { setSubmitting }: FormikHelpers<T>) => {
    // TODO: maybe final validation using all individual schemas
    if (!isLastStep()) {
      setSubmitting(false);
      handleNext();
      return;
    }

    onSubmit(values)
      .then(() => setSubmitting(false))
      .catch(() => setSubmitting(false));
  };

  const currentStep = steps[activeStep];
  const CurrentForm = currentStep.form;
  const validationSchema = currentStep.schema;

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={toFormikValidationSchema(validationSchema)}
      onSubmit={handleSubmit}
    >
      {(formik) => (
        <Form>
          <Stack spacing={2}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((step, index) => (
                <Step key={step.title}>
                  <StepButton onClick={() => handleStep(index)}>{step.title}</StepButton>
                </Step>
              ))}
            </Stepper>
            <Divider />
            <CurrentForm {...formik} />
            <Divider />
            <Box display="flex" flexDirection="row" justifyContent="space-between">
              <Button disabled={activeStep === 0 || formik.isSubmitting} onClick={handlePrev}>
                Previous
              </Button>
              <Button type="submit" disabled={formik.isSubmitting}>
                {isLastStep() ? "Submit" : "Next"}
              </Button>
            </Box>
          </Stack>
        </Form>
      )}
    </Formik>
  );
}
