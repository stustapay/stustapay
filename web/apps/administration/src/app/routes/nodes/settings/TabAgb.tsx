import { MarkdownEditor } from "@/components";
import * as React from "react";
import { Language, RestrictedEventSettings, useUpdateEventMutation } from "@/api";
import {
  Button,
  LinearProgress,
  Stack,
  Switch,
  FormGroup,
  FormControlLabel,
  FormControl,
  FormHelperText,
} from "@mui/material";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { TranslationTexts, TranslationTextsSchema, updateTranslationTexts } from "./common";
import { LanguageDropdown } from "./LanguageDropdown";

export const TabAgb: React.FC<{ nodeId: number; eventSettings: RestrictedEventSettings }> = ({
  nodeId,
  eventSettings,
}) => {
  const { t } = useTranslation();
  const [language, setLanguage] = React.useState<Language>("en-US");
  const [updateEvent] = useUpdateEventMutation();
  const [preview, setPreview] = React.useState(true);

  const handleSubmit = (values: TranslationTexts, { setSubmitting }: FormikHelpers<TranslationTexts>) => {
    setSubmitting(true);
    updateEvent({ nodeId: nodeId, updateEvent: { ...eventSettings, ...values } })
      .unwrap()
      .then(() => {
        setSubmitting(false);
        toast.success(t("settings.updateEventSucessful"));
      })
      .catch((err) => {
        setSubmitting(false);
        toast.error(t("settings.updateEventFailed", { reason: err.error }));
      });
  };

  return (
    <Formik
      initialValues={eventSettings as TranslationTexts} // TODO: figure out a way of not needing to cast this
      onSubmit={handleSubmit}
      validationSchema={toFormikValidationSchema(TranslationTextsSchema)}
      enableReinitialize={true}
    >
      {(formik) => (
        <Form onSubmit={formik.handleSubmit}>
          <Stack spacing={2}>
            <LanguageDropdown value={language} onChange={setLanguage} eventSettings={eventSettings} />
            <FormGroup>
              <FormControlLabel
                label={t("settings.agb.preview")}
                control={<Switch checked={preview} onChange={(evt) => setPreview(evt.target.checked)} />}
              />
            </FormGroup>

            <FormControl error={!!formik.errors.translation_texts}>
              <MarkdownEditor
                label={t("settings.agb.content")}
                value={formik.values.translation_texts[language]?.["agb"] ?? ""}
                onChange={(val) => {
                  const newSettings = updateTranslationTexts(formik.values.translation_texts, language, "agb", val);
                  formik.setFieldValue("translation_texts", newSettings);
                  formik.setFieldTouched("translation_texts");
                }}
                showPreview={preview}
              />
              {!!formik.errors.translation_texts && (
                <FormHelperText>{String(formik.errors.translation_texts)}</FormHelperText>
              )}
            </FormControl>
            {formik.isSubmitting && <LinearProgress />}
            <Button
              type="submit"
              color="primary"
              variant="contained"
              disabled={formik.isSubmitting || Object.keys(formik.touched).length === 0}
            >
              {t("save")}
            </Button>
          </Stack>
        </Form>
      )}
    </Formik>
  );
};
