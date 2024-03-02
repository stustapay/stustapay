import { useFindCustomersMutation } from "@/api";
import { DetailLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Button, LinearProgress, Paper } from "@mui/material";
import { FormTextField } from "@stustapay/form-components";
import { toFormikValidationSchema, useQueryVar } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";
import { CustomerTable } from "./components/CustomerTable";

const SearchFormSchema = z.object({
  searchTerm: z.string(),
});

type SearchForm = z.infer<typeof SearchFormSchema>;

export const CustomerSearch: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [findCustomers, searchResult] = useFindCustomersMutation();
  const [persistedSearch, setPersistedSearch] = useQueryVar("search", undefined);

  const handleSubmit = (values: SearchForm, { setSubmitting }: FormikHelpers<SearchForm>) => {
    setPersistedSearch(values.searchTerm);
    setSubmitting(false);
  };

  React.useEffect(() => {
    if (persistedSearch == null) {
      return;
    }

    findCustomers({ nodeId: currentNode.id, findCustomerPayload: { search_term: persistedSearch } })
      .unwrap()
      .catch((err) => {
        toast.error(`error while searching for customers: ${err.data.detail}`);
      });
  }, [currentNode.id, findCustomers, persistedSearch]);

  return (
    <DetailLayout title={t("customer.search")}>
      <Paper sx={{ p: 3 }}>
        <Formik
          initialValues={{ searchTerm: persistedSearch ?? "" }}
          onSubmit={handleSubmit}
          validationSchema={toFormikValidationSchema(SearchFormSchema)}
        >
          {(formik) => (
            <Form onSubmit={formik.handleSubmit}>
              <FormTextField label={t("account.searchTerm")} variant="outlined" name="searchTerm" formik={formik} />
              {formik.isSubmitting && <LinearProgress />}
              <Button type="submit">{t("submit")}</Button>
            </Form>
          )}
        </Formik>
      </Paper>
      {searchResult.data && <CustomerTable customers={searchResult.data} />}
    </DetailLayout>
  );
};
