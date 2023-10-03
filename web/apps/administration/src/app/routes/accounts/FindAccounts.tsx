import { selectAccountAll, useFindAccountsMutation } from "@/api";
import { DetailLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Button, LinearProgress, Paper, TextField } from "@mui/material";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";
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
  const { currentNode } = useCurrentNode();
  const [findAccounts, searchResult] = useFindAccountsMutation();

  const handleSubmit = (values: SearchForm, { setSubmitting }: FormikHelpers<SearchForm>) => {
    setSubmitting(true);
    findAccounts({ nodeId: currentNode.id, findAccountPayload: { search_term: values.searchTerm } })
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
    <DetailLayout title={t("findAccounts")}>
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
      {searchResult.data && <AccountTable accounts={selectAccountAll(searchResult.data)} />}
    </DetailLayout>
  );
};
