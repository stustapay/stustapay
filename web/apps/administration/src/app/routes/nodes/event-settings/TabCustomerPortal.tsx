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
import { useSelector } from "react-redux";
import { selectAuthToken } from "@/store";

export const CustomerPortalSettingsSchema = z.object({
  customer_portal_url: z.string().url(),
  customer_portal_contact_email: z.string().email(),
  customer_portal_about_page_url: z.string().url(),
  customer_portal_data_privacy_url: z.string().url(),
  donation_enabled: z.boolean(),
  customer_portal_primary_color: z.string().optional().nullable(),
  customer_portal_secondary_color: z.string().optional().nullable(),
  customer_portal_background_color: z.string().optional().nullable(),
});

export type CustomerPortalSettings = z.infer<typeof CustomerPortalSettingsSchema>;


interface BannerUploadProps {
  nodeId: number;
}

const BannerUpload: React.FC<BannerUploadProps> = ({ nodeId }) => {
  const { t } = useTranslation();
  const [bannerUrl, setBannerUrl] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const token = useSelector(selectAuthToken);

  // Load current banner on mount
  React.useEffect(() => {
    const checkBanner = async () => {
      try {
        const headers: HeadersInit = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(`/api/tree/events/${nodeId}/banner`, {
          headers,
        });
        if (response.ok) {
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          setBannerUrl(objectUrl);
        } else {
          setBannerUrl(null);
        }
      } catch {
        setBannerUrl(null);
      }
    };
    checkBanner();

    // Cleanup object URL
    return () => {
      if (bannerUrl && bannerUrl.startsWith("blob:")) {
        URL.revokeObjectURL(bannerUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId, token]); // Add token dependency

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

      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/tree/events/${nodeId}/banner`, {
        method: "POST",
        body: formData,
        headers,
      });

      if (response.ok) {
        // Refresh banner
        const checkResponse = await fetch(`/api/tree/events/${nodeId}/banner`, { headers });
        if (checkResponse.ok) {
          const blob = await checkResponse.blob();
          const objectUrl = URL.createObjectURL(blob);
          setBannerUrl(objectUrl);
        }

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
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/tree/events/${nodeId}/banner`, {
        method: "DELETE",
        headers,
      });

      if (response.ok) {
        if (bannerUrl && bannerUrl.startsWith("blob:")) {
          URL.revokeObjectURL(bannerUrl);
        }
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
    <Box>
      <Typography variant="subtitle2" gutterBottom>
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
          size="small"
        >
          {isUploading ? (t("settings.customerPortal.uploading") || "Uploading...") : (t("settings.customerPortal.uploadBanner") || "Upload Banner")}
        </Button>
      </label>
      {isUploading && <LinearProgress sx={{ mt: 1 }} />}
    </Box>
  );
};

export const CustomerPortalSettingsForm: React.FC<FormikProps<CustomerPortalSettings> & { nodeId?: number }> = ({ nodeId, ...formik }) => {
  const { t } = useTranslation();
  return (
    <Stack spacing={3}>
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

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" gutterBottom fontWeight="medium">
          {t("settings.customerPortal.appearance") || "Appearance"}
        </Typography>
        <Stack spacing={3}>
          {nodeId && <BannerUpload nodeId={nodeId} />}

          <Stack direction="row" spacing={4}>
            <FormTextField
              label={t("settings.customerPortal.primaryColor")}
              name="customer_portal_primary_color"
              formik={formik}
              type="color"
              sx={{ width: 150 }}
              InputLabelProps={{ shrink: true }}
            />
            <FormTextField
              label={t("settings.customerPortal.secondaryColor")}
              name="customer_portal_secondary_color"
              formik={formik}
              type="color"
              sx={{ width: 150 }}
              InputLabelProps={{ shrink: true }}
            />
            <FormTextField
              label={t("settings.customerPortal.backgroundColor")}
              name="customer_portal_background_color"
              formik={formik}
              type="color"
              sx={{ width: 150 }}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </Stack>
      </Paper>

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
    </Stack>
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
    donation_enabled: eventSettings.donation_enabled ?? true,
    customer_portal_primary_color: eventSettings.customer_portal_primary_color || "#3A0CA3",
    customer_portal_secondary_color: eventSettings.customer_portal_secondary_color || "#4CC9F0",
    customer_portal_background_color: eventSettings.customer_portal_background_color || "#f5f7fa",
  };

  return (
    <Stack spacing={3}>
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={toFormikValidationSchema(CustomerPortalSettingsSchema)}
        enableReinitialize={true}
      >
        {(formik) => (
          <Form onSubmit={formik.handleSubmit}>
            <Stack spacing={2}>
              <CustomerPortalSettingsForm nodeId={nodeId} {...formik} />
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


