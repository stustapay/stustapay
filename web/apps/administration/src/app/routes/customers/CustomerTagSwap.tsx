import { SwapHoriz as SwapHorizIcon } from "@mui/icons-material";
import { Autocomplete, Button, LinearProgress, Paper, Stack, TextField } from "@mui/material";
import { FormTextField } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";

import { selectUserTagAll, UserTagDetailRead, useFindUserTagsMutation, useSwitchCustomerTagMutation } from "@/api";
import { DetailLayout } from "@/components";
import { useCurrentNode } from "@/hooks";

const SwapFormSchema = z.object({
  oldUserTagPin: z.string().min(1),
  newUserTagPin: z.string().min(1),
  comment: z.string(),
});

type SwapForm = z.infer<typeof SwapFormSchema>;

const initialValues: SwapForm = {
  oldUserTagPin: "",
  newUserTagPin: "",
  comment: "",
};

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(handle);
  }, [value, delay]);

  return debouncedValue;
}

const formatTagOption = (tag: UserTagDetailRead) => {
  const parts = [tag.pin];
  if (tag.uid_hex) {
    parts.push(tag.uid_hex);
  }
  if (tag.comment) {
    parts.push(tag.comment);
  }
  return parts.join(" · ");
};

type TagPinAutocompleteProps = {
  label: string;
  helperText?: string;
  value: string;
  onChange: (pin: string) => void;
  filterType: "assigned" | "unassigned";
};

const filterTagOption = (tag: UserTagDetailRead, filterType: TagPinAutocompleteProps["filterType"]) => {
  if (filterType === "assigned") {
    return tag.account_id != null;
  }
  return tag.account_id == null && tag.account_history.length === 0;
};

const TagPinAutocomplete: React.FC<TagPinAutocompleteProps> = ({ label, helperText, value, onChange, filterType }) => {
  const { currentNode } = useCurrentNode();
  const [findUserTags] = useFindUserTagsMutation();
  const [inputValue, setInputValue] = React.useState(value);
  const [options, setOptions] = React.useState<UserTagDetailRead[]>([]);
  const [loading, setLoading] = React.useState(false);
  const debouncedInput = useDebouncedValue(inputValue, 300);

  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  React.useEffect(() => {
    const searchTerm = debouncedInput.trim();
    if (!searchTerm) {
      setOptions([]);
      return;
    }

    setLoading(true);
    findUserTags({ nodeId: currentNode.id, findUserTagPayload: { search_term: searchTerm } })
      .unwrap()
      .then((result) => {
        setOptions(selectUserTagAll(result).filter((tag) => filterTagOption(tag, filterType)));
      })
      .catch(() => {
        setOptions([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentNode.id, debouncedInput, filterType, findUserTags]);

  return (
    <Autocomplete
      freeSolo
      options={options}
      loading={loading}
      inputValue={inputValue}
      onInputChange={(_, newInputValue) => {
        setInputValue(newInputValue);
        onChange(newInputValue);
      }}
      onChange={(_, newValue) => {
        if (typeof newValue === "string") {
          onChange(newValue);
          setInputValue(newValue);
          return;
        }
        if (newValue) {
          onChange(newValue.pin);
          setInputValue(newValue.pin);
        }
      }}
      getOptionLabel={(option) => (typeof option === "string" ? option : formatTagOption(option))}
      isOptionEqualToValue={(option, selected) =>
        typeof option === "string" || typeof selected === "string" ? option === selected : option.pin === selected.pin
      }
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          {formatTagOption(option)}
          {option.account_id != null ? " (assigned)" : ""}
        </li>
      )}
      renderInput={(params) => (
        <TextField {...params} label={label} helperText={helperText} variant="outlined" margin="normal" />
      )}
    />
  );
};

export const CustomerTagSwap: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [switchCustomerTag] = useSwitchCustomerTagMutation();

  const handleSubmit = async (values: SwapForm, { resetForm, setSubmitting }: FormikHelpers<SwapForm>) => {
    try {
      await switchCustomerTag({
        nodeId: currentNode.id,
        switchCustomerTagPayload: {
          old_user_tag_pin: values.oldUserTagPin.trim(),
          new_user_tag_pin: values.newUserTagPin.trim(),
          comment: values.comment,
        },
      }).unwrap();
      toast.success(t("customer.swapTagSuccess"));
      resetForm();
    } catch (err: any) {
      toast.error(`${t("customer.swapTagError")}: ${err?.data?.detail ?? err.toString()}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DetailLayout title={t("customer.swapTag")}>
      <Paper sx={{ p: 3 }}>
        <Formik
          initialValues={initialValues}
          onSubmit={handleSubmit}
          validationSchema={toFormikValidationSchema(SwapFormSchema)}
        >
          {(formik) => (
            <Form onSubmit={formik.handleSubmit}>
              <Stack spacing={2}>
                <TagPinAutocomplete
                  label={t("customer.sourceTagPin")}
                  helperText={t("customer.sourceTagAssignedOnly")}
                  value={formik.values.oldUserTagPin}
                  onChange={(pin) => void formik.setFieldValue("oldUserTagPin", pin)}
                  filterType="assigned"
                />
                <TagPinAutocomplete
                  label={t("customer.targetTagPin")}
                  helperText={t("customer.targetTagUnassignedOnly")}
                  value={formik.values.newUserTagPin}
                  onChange={(pin) => void formik.setFieldValue("newUserTagPin", pin)}
                  filterType="unassigned"
                />
                <FormTextField
                  label={t("account.comment")}
                  variant="outlined"
                  name="comment"
                  formik={formik}
                  multiline
                  minRows={3}
                />
                {formik.isSubmitting && <LinearProgress />}
                <Button type="submit" variant="contained" startIcon={<SwapHorizIcon />} disabled={formik.isSubmitting}>
                  {t("customer.swapTagSubmit")}
                </Button>
              </Stack>
            </Form>
          )}
        </Formik>
      </Paper>
    </DetailLayout>
  );
};
