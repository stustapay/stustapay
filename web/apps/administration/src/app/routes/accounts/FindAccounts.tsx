import * as React from "react";
import { Paper, ListItem, ListItemText, TextField, Button, LinearProgress, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useFindAccountsMutation } from "@api";
import { toast } from "react-toastify";
import { z } from "zod";
import { Form, Formik, FormikHelpers } from "formik";
import { toFormikValidationSchema } from "@stustapay/utils";
import { AccountTable } from "./components/AccountTable";

const SearchFormSchema = z.object({
  searchTerm: z.string(),
});

type SearchForm = z.infer<typeof SearchFormSchema>;

const initialValues: SearchForm = {
  searchTerm: "",
};

export const FindAccounts: React.FC = () => {
  const { t } = useTranslation();
  const [findAccounts, searchResult] = useFindAccountsMutation();

  const handleSubmit = (values: SearchForm, { setSubmitting }: FormikHelpers<SearchForm>) => {
    setSubmitting(true);
    findAccounts(values.searchTerm)
      .unwrap()
      .then(() => {
        setSubmitting(false);
      })
      .catch((err) => {
        toast.error(`error while searching for accounts: ${err.toString()}`);
        setSubmitting(false);
      });
  };

  return (
    <Stack spacing={2}>
      <Paper>
        <ListItem>
          <ListItemText primary={t("findAccounts")} />
        </ListItem>
      </Paper>
      <Paper sx={{ p: 3 }}>
        <Formik
          initialValues={initialValues}
          onSubmit={handleSubmit}
          validationSchema={toFormikValidationSchema(SearchFormSchema)}
        >
          {({ values, handleBlur, handleChange, handleSubmit, isSubmitting }) => (
            <Form onSubmit={handleSubmit}>
              <TextField
                label={t("account.searchTerm")}
                fullWidth
                name="searchTerm"
                value={values.searchTerm}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              {isSubmitting && <LinearProgress />}
              <Button type="submit">{t("submit")}</Button>
            </Form>
          )}
        </Formik>
      </Paper>
      {searchResult.data && <AccountTable accounts={searchResult.data} />}
    </Stack>
  );
};
