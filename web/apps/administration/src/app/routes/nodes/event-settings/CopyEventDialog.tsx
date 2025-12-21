import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Stack,
  Typography,
  Box,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useCopyEventMutation } from "@/api";
import { toast } from "react-toastify";
import { LoadingButton } from "@mui/lab";

interface CopyEventDialogProps {
  open: boolean;
  onClose: () => void;
  sourceNodeId: number;
  sourceNodeName: string;
}

export const CopyEventDialog: React.FC<CopyEventDialogProps> = ({ open, onClose, sourceNodeId, sourceNodeName }) => {
  const { t } = useTranslation();
  const [copyEvent, { isLoading }] = useCopyEventMutation();

  const [formData, setFormData] = React.useState({
    name: "",
    description: "",
    options: {
      copy_event_settings: true,
      copy_user_tags: true,
      copy_account_balances: false,
      copy_tills: true,
      copy_terminals: true,
      copy_users: true,
      copy_products: true,
      copy_tse_devices: true,
    },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await copyEvent({
        nodeId: sourceNodeId,
        copyEventRequest: formData,
      }).unwrap();
      toast.success(t("settings.copyEvent.success"));
      onClose();
      // Reset form
      setFormData({
        name: "",
        description: "",
        options: {
          copy_event_settings: true,
          copy_user_tags: true,
          copy_account_balances: false,
          copy_tills: true,
          copy_terminals: true,
          copy_users: true,
          copy_products: true,
          copy_tse_devices: true,
        },
      });
    } catch (error) {
      toast.error(`Error copying event: ${error}`);
    }
  };

  const handleOptionChange = (option: keyof typeof formData.options) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      options: {
        ...prev.options,
        [option]: event.target.checked,
      },
    }));
  };

  const handleTextChange = (field: keyof Pick<typeof formData, "name" | "description">) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{t("settings.copyEvent.title")}</DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            <Typography variant="body2" color="text.secondary">
              {t("settings.copyEvent.description", { sourceNodeName })}
            </Typography>

            <TextField
              label={t("settings.copyEvent.newEventName")}
              value={formData.name}
              onChange={handleTextChange("name")}
              required
              fullWidth
            />

            <TextField
              label={t("settings.copyEvent.newEventDescription")}
              value={formData.description}
              onChange={handleTextChange("description")}
              multiline
              rows={2}
              fullWidth
            />

            <Box>
              <Typography variant="h6" gutterBottom>
                {t("settings.copyEvent.optionsTitle")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t("settings.copyEvent.optionsDescription")}
              </Typography>

              <Stack spacing={1}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.options.copy_event_settings}
                      onChange={handleOptionChange("copy_event_settings")}
                    />
                  }
                  label={t("settings.copyEvent.options.eventSettings")}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.options.copy_user_tags}
                      onChange={handleOptionChange("copy_user_tags")}
                    />
                  }
                  label={t("settings.copyEvent.options.userTags")}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.options.copy_account_balances}
                      onChange={handleOptionChange("copy_account_balances")}
                    />
                  }
                  label={t("settings.copyEvent.options.accountBalances")}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.options.copy_tills}
                      onChange={handleOptionChange("copy_tills")}
                    />
                  }
                  label={t("settings.copyEvent.options.tills")}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.options.copy_terminals}
                      onChange={handleOptionChange("copy_terminals")}
                    />
                  }
                  label={t("settings.copyEvent.options.terminals")}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.options.copy_users}
                      onChange={handleOptionChange("copy_users")}
                    />
                  }
                  label={t("settings.copyEvent.options.users")}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.options.copy_products}
                      onChange={handleOptionChange("copy_products")}
                    />
                  }
                  label={t("settings.copyEvent.options.products")}
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.options.copy_tse_devices}
                      onChange={handleOptionChange("copy_tse_devices")}
                    />
                  }
                  label={t("settings.copyEvent.options.tseDevices")}
                />
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <LoadingButton
            type="submit"
            variant="contained"
            loading={isLoading}
            disabled={!formData.name.trim()}
          >
            {t("settings.copyEvent.copyButton")}
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
};
