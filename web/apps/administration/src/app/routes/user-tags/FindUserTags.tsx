import { selectUserTagAll, useFindUserTagsMutation } from "@/api";
import { DetailLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Button, LinearProgress, Paper } from "@mui/material";
import { FormTextField } from "@stustapay/form-components";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";
import { UserTagTable } from "./components/UserTagTable";

const SearchFormSchema = z.object({
  searchTerm: z.string(),
});

type SearchForm = z.infer<typeof SearchFormSchema>;

const initialValues: SearchForm = {
  searchTerm: "",
};

export const FindUserTags: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [findUserTags, searchResult] = useFindUserTagsMutation();

  const handleSubmit = (values: SearchForm, { setSubmitting }: FormikHelpers<SearchForm>) => {
    setSubmitting(true);
    findUserTags({ nodeId: currentNode.id, findUserTagPayload: { search_term: values.searchTerm } })
      .unwrap()
      .then(() => {
        setSubmitting(false);
      })
      .catch((err) => {
        toast.error(`error while searching for user tags: ${err.toString()}`);
        setSubmitting(false);
      });
  };

  return (
    <DetailLayout title={t("userTag.find")}>
      <Paper sx={{ p: 3 }}>
        <Formik
          initialValues={initialValues}
          onSubmit={handleSubmit}
          validationSchema={toFormikValidationSchema(SearchFormSchema)}
        >
          {(formik) => (
            <Form onSubmit={formik.handleSubmit}>
              <FormTextField label={t("userTag.searchTerm")} variant="outlined" name="searchTerm" formik={formik} />
              {formik.isSubmitting && <LinearProgress />}
              <Button type="submit">{t("submit")}</Button>
            </Form>
          )}
        </Formik>
      </Paper>
      {searchResult.data && <UserTagTable userTags={selectUserTagAll(searchResult.data)} />}
    </DetailLayout>
  );
};
