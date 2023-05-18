import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  DialogActions,
  ListItem,
  ListItemText,
  TextField,
  LinearProgress,
  Stack,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { Account, formatUserTagUid } from "@stustapay/models";
import { toast } from "react-toastify";
import { useUpdateTagUidMutation } from "@api";
import { Formik, FormikHelpers } from "formik";
import { z } from "zod";
import { toFormikValidationSchema } from "@stustapay/utils";

const FormSchema = z.object({
  comment: z.string(),
  newTagUidHex: z.string(),
});

type FormValues = z.infer<typeof FormSchema>;

export interface EditAccountTagModalProps {
  account: Account;
  open: boolean;
  handleClose: () => void;
}

export const EditAccountTagModal: React.FC<EditAccountTagModalProps> = ({ account, open, handleClose }) => {
  const { t } = useTranslation();

  const [updateTagUid] = useUpdateTagUidMutation();

  const handleSubmit = (values: FormValues, { setSubmitting, resetForm }: FormikHelpers<FormValues>) => {
    setSubmitting(true);
    updateTagUid({ accountId: account.id, newTagUidHex: "0x" + values.newTagUidHex, comment: values.comment })
      .unwrap()
      .then(() => {
        setSubmitting(false);
        handleClose();
        resetForm();
      })
      .catch((e) => {
        setSubmitting(false);
        console.log("error", e);
        toast.error(`updating tag uid failed`);
      });
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <Formik
        initialValues={{ newTagUidHex: "", comment: "" }}
        onSubmit={handleSubmit}
        validationSchema={toFormikValidationSchema(FormSchema)}
      >
        {({ values, handleBlur, handleChange, handleSubmit, isSubmitting, errors, touched }) => (
          <>
            <DialogTitle>{t("account.changeTag")}</DialogTitle>
            <DialogContent>
              <ListItem sx={{ pl: 0 }}>
                <ListItemText primary={t("account.oldTagUid")} secondary={formatUserTagUid(account.user_tag_uid_hex)} />
              </ListItem>
              <Stack spacing={1}>
                <TextField
                  variant="standard"
                  fullWidth
                  name="newTagUidHex"
                  inputProps={{ pattern: "[a-f0-9]+" }}
                  label={t("account.newTagUid")}
                  error={touched.newTagUidHex && !!errors.newTagUidHex}
                  helperText={(touched.newTagUidHex && errors.newTagUidHex) as string}
                  onBlur={handleBlur}
                  onChange={handleChange}
                  value={values.newTagUidHex}
                />
                <TextField
                  variant="standard"
                  fullWidth
                  name="comment"
                  label={t("account.history.comment")}
                  error={touched.comment && !!errors.comment}
                  helperText={(touched.comment && errors.comment) as string}
                  onBlur={handleBlur}
                  onChange={handleChange}
                  value={values.comment}
                />
              </Stack>
            </DialogContent>
            {isSubmitting && <LinearProgress />}
            <DialogActions>
              <Button onClick={handleClose} color="error">
                {t("cancel")}
              </Button>
              <Button onClick={() => handleSubmit()} disabled={isSubmitting} color="primary">
                {t("submit")}
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};
