import { AccountRead, useUpdateTagUidMutation } from "@/api";
import { useCurrentNode } from "@/hooks";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  ListItem,
  ListItemText,
  Stack,
} from "@mui/material";
import { FormTextField } from "@stustapay/form-components";
import { formatUserTagUid } from "@stustapay/models";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Formik, FormikHelpers } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";

const FormSchema = z.object({
  comment: z.string(),
  newTagUidHex: z.string(),
});

type FormValues = z.infer<typeof FormSchema>;

export interface EditAccountTagModalProps {
  account: AccountRead;
  open: boolean;
  handleClose: () => void;
}

export const EditAccountTagModal: React.FC<EditAccountTagModalProps> = ({ account, open, handleClose }) => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  const [updateTagUid] = useUpdateTagUidMutation();

  const handleSubmit = (values: FormValues, { setSubmitting, resetForm }: FormikHelpers<FormValues>) => {
    setSubmitting(true);
    updateTagUid({
      nodeId: currentNode.id,
      accountId: account.id,
      updateTagUidPayload: { new_tag_uid_hex: "0x" + values.newTagUidHex, comment: values.comment },
    })
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
        {(formik) => (
          <>
            <DialogTitle>{t("account.changeTag")}</DialogTitle>
            <DialogContent>
              <ListItem sx={{ pl: 0 }}>
                <ListItemText primary={t("account.oldTagUid")} secondary={formatUserTagUid(account.user_tag_uid_hex)} />
              </ListItem>
              <Stack spacing={1}>
                <FormTextField
                  name="newTagUidHex"
                  inputProps={{ pattern: "[a-f0-9]+" }}
                  label={t("account.newTagUid")}
                  formik={formik}
                />
                <FormTextField name="comment" label={t("account.history.comment")} formik={formik} />
              </Stack>
            </DialogContent>
            {formik.isSubmitting && <LinearProgress />}
            <DialogActions>
              <Button onClick={handleClose} color="error">
                {t("cancel")}
              </Button>
              <Button onClick={() => formik.handleSubmit()} disabled={formik.isSubmitting} color="primary">
                {t("submit")}
              </Button>
            </DialogActions>
          </>
        )}
      </Formik>
    </Dialog>
  );
};
