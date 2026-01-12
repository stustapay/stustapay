import {
  selectUserTagAll,
  useFindUserTagsMutation,
  useCountTagsWithoutAccountsQuery,
  useCreateAccountsForUserTagsMutation,
} from "@/api";
import { DetailLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { Button, LinearProgress, Paper, Alert, Box } from "@mui/material";
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
  const { data: tagsWithoutAccountsCount, refetch: refetchCount } = useCountTagsWithoutAccountsQuery({
    nodeId: currentNode.id,
  });
  const [createAccounts, { isLoading: isCreatingAccounts }] = useCreateAccountsForUserTagsMutation();
  const [accountCreationResult, setAccountCreationResult] = React.useState<{ created: number; skipped: number } | null>(
    null
  );

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

  const handleCreateAccounts = async () => {
    try {
      const result = await createAccounts({
        nodeId: currentNode.id,
        createAccountsPayload: { user_tag_ids: null },
      }).unwrap();
      setAccountCreationResult(result);
      toast.success(
        t("userTag.accountCreation.success", {
          created: result.created,
          skipped: result.skipped,
        })
      );
      // Refetch count to update the UI
      refetchCount();
    } catch (error) {
      toast.error(t("userTag.accountCreation.error"));
      console.error("Error creating accounts:", error);
    }
  };

  return (
    <DetailLayout title={t("userTag.find")}>
      {tagsWithoutAccountsCount !== undefined && tagsWithoutAccountsCount > 0 && (
        <Paper sx={{ p: 3, mb: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            {t("userTag.accountCreation.tagsWithoutAccounts", { count: tagsWithoutAccountsCount })}
          </Alert>
          {accountCreationResult && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {t("userTag.accountCreation.result", {
                created: accountCreationResult.created,
                skipped: accountCreationResult.skipped,
              })}
            </Alert>
          )}
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleCreateAccounts}
              disabled={isCreatingAccounts || accountCreationResult !== null}
            >
              {t("userTag.accountCreation.createButton")}
            </Button>
          </Box>
        </Paper>
      )}
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
