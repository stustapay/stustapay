import { RestrictedEventSettings, useUpdateEventMutation } from "@/api";
import { Button, FormControlLabel, LinearProgress, Stack, Switch, Box, Typography, IconButton, Paper } from "@mui/material";
import { FormTextField } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers, FormikProps } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

export const CustomerPortalSettingsSchema = z.object({
  customer_portal_url: z.string().url(),
  customer_portal_contact_email: z.string().email(),
  customer_portal_about_page_url: z.string().url(),
  customer_portal_data_privacy_url: z.string().url(),
  donation_enabled: z.boolean(),
});

export type CustomerPortalSettings = z.infer<typeof CustomerPortalSettingsSchema>;

export const CustomerPortalSettingsForm: React.FC<FormikProps<CustomerPortalSettings>> = (formik) => {
  const { t } = useTranslation();
  return (
    <>
      <FormTextField label={t("settings.customerPortal.baseUrl")} name="customer_portal_url" formik={formik} />
      <FormTextField
        label={t("settings.customerPortal.contact_email")}
        name="customer_portal_contact_email"
        formik={formik}
      />
      <FormTextField
        label={t("settings.customerPortal.about_page_url")}
        name="customer_portal_about_page_url"
        formik={formik}
      />
      <FormTextField
        label={t("settings.customerPortal.data_privacy_url")}
        name="customer_portal_data_privacy_url"
        formik={formik}
      />
      <FormControlLabel
        control={
          <Switch
            checked={formik.values.donation_enabled}
            onChange={(event) => {
              formik.setFieldValue("donation_enabled", event.target.checked);
              formik.setFieldTouched("donation_enabled", true);
            }}
            name="donation_enabled"
            color="primary"
          />
        }
        label={t("settings.customerPortal.donation_enabled")}
      />
    </>
  );
};

interface BannerUploadProps {
  nodeId: number;
}

const BannerUpload: React.FC<BannerUploadProps> = ({ nodeId }) => {
  const { t } = useTranslation();
  const [bannerUrl, setBannerUrl] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load current banner on mount
  React.useEffect(() => {
    const checkBanner = async () => {
      try {
        const response = await fetch(`/api/tree/events/${nodeId}/banner`);
        if (response.ok) {
          setBannerUrl(`/api/tree/events/${nodeId}/banner?t=${Date.now()}`);
        } else {
          setBannerUrl(null);
        }
      } catch {
        setBannerUrl(null);
      }
    };
    checkBanner();
  }, [nodeId]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error(t("settings.customerPortal.invalidImageType") || "Invalid image type");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("settings.customerPortal.imageTooLarge") || "Image too large (max 5MB)");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/tree/events/${nodeId}/banner`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (response.ok) {
        setBannerUrl(`/api/tree/events/${nodeId}/banner?t=${Date.now()}`);
        toast.success(t("settings.customerPortal.bannerUploaded") || "Banner uploaded successfully");
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Banner upload error:", error);
      toast.error(t("settings.customerPortal.bannerUploadFailed") || "Banner upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/tree/events/${nodeId}/banner`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        setBannerUrl(null);
        toast.success(t("settings.customerPortal.bannerDeleted") || "Banner deleted");
      } else {
        throw new Error("Delete failed");
      }
    } catch (error) {
      console.error("Banner delete error:", error);
      toast.error(t("settings.customerPortal.bannerDeleteFailed") || "Banner delete failed");
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" gutterBottom fontWeight="medium">
        {t("settings.customerPortal.bannerImage") || "Banner Image"}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {t("settings.customerPortal.bannerImageDescription") || "Upload an image to display as a header banner in the customer portal."}
      </Typography>

      {bannerUrl && (
        <Box sx={{ mb: 2, position: "relative" }}>
          <Box
            component="img"
            src={bannerUrl}
            alt="Event banner"
            sx={{
              width: "100%",
              maxHeight: 200,
              objectFit: "cover",
              borderRadius: 1,
            }}
          />
          <IconButton
            onClick={handleDelete}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              bgcolor: "rgba(0,0,0,0.5)",
              color: "white",
              "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
            }}
            size="small"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        style={{ display: "none" }}
        id="banner-upload-input"
      />
      <label htmlFor="banner-upload-input">
        <Button
          component="span"
          variant="outlined"
          startIcon={<CloudUploadIcon />}
          disabled={isUploading}
        >
          {isUploading ? (t("settings.customerPortal.uploading") || "Uploading...") : (t("settings.customerPortal.uploadBanner") || "Upload Banner")}
        </Button>
      </label>
      {isUploading && <LinearProgress sx={{ mt: 1 }} />}
    </Paper>
  );
};

export const TabCustomerPortal: React.FC<{ nodeId: number; eventSettings: RestrictedEventSettings }> = ({
  nodeId,
  eventSettings,
}) => {
  const { t } = useTranslation();
  const [updateEvent] = useUpdateEventMutation();

  const handleSubmit = (values: CustomerPortalSettings, { setSubmitting }: FormikHelpers<CustomerPortalSettings>) => {
    setSubmitting(true);
    console.log("Submitting values:", values);
    console.log("donation_enabled value:", values.donation_enabled);
    console.log("Update payload:", { ...eventSettings, ...values });
    updateEvent({ nodeId: nodeId, updateEvent: { ...eventSettings, ...values } })
      .unwrap()
      .then(() => {
        setSubmitting(false);
        toast.success(t("settings.updateEventSucessful"));
      })
      .catch((err) => {
        setSubmitting(false);
        console.error("Error updating event:", err);
        toast.error(t("settings.updateEventFailed", { reason: err.error }));
      });
  };

  // Create a properly typed initial values object from the event settings
  const initialValues: CustomerPortalSettings = {
    customer_portal_url: eventSettings.customer_portal_url,
    customer_portal_contact_email: eventSettings.customer_portal_contact_email,
    customer_portal_about_page_url: eventSettings.customer_portal_about_page_url,
    customer_portal_data_privacy_url: eventSettings.customer_portal_data_privacy_url,
    donation_enabled: eventSettings.donation_enabled ?? true
  };

  return (
    <Stack spacing={3}>
      <BannerUpload nodeId={nodeId} />

      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={toFormikValidationSchema(CustomerPortalSettingsSchema)}
        enableReinitialize={true}
      >
        {(formik) => (
          <Form onSubmit={formik.handleSubmit}>
            <Stack spacing={2}>
              <CustomerPortalSettingsForm {...formik} />
              {formik.isSubmitting && <LinearProgress />}
              <Button
                type="submit"
                color="primary"
                variant="contained"
                disabled={formik.isSubmitting || !formik.dirty}
              >
                {t("save")}
              </Button>
            </Stack>
          </Form>
        )}
      </Formik>
    </Stack>
  );
};

