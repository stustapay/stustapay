import { FileDownload as FileDownloadIcon } from "@mui/icons-material";
import { Button, Checkbox, FormControlLabel, LinearProgress, Paper } from "@mui/material";
import { FormTextField } from "@stustapay/form-components";
import { useOpenModal } from "@stustapay/modal-provider";
import { toFormikValidationSchema } from "@stustapay/utils";
import { Form, Formik, FormikHelpers } from "formik";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";

import { selectUserTagAll, useFindUserTagsMutation, useUserTagsCsvExportMutation } from "@/api";
import { DetailLayout } from "@/components";
import { LayoutAction } from "@/components/layouts/types";
import { useCurrentNode } from "@/hooks";

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
  const [csvExport] = useUserTagsCsvExportMutation();
  const openModal = useOpenModal();

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

  const downloadCsv = async (excludeActivated: boolean) => {
    try {
      const data = await csvExport({
        nodeId: currentNode.id,
        userTagsCsvExportPayload: { exclude_activated: excludeActivated },
      }).unwrap();
      const url = window.URL.createObjectURL(new Blob([data], { type: "text/csv" }));
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", excludeActivated ? "user_tags_unactivated.csv" : "user_tags.csv");
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(t("userTag.exportError"));
    }
  };

  const handleExport = () => {
    let excludeActivated = false;
    openModal({
      type: "confirm",
      title: t("userTag.exportCsv"),
      content: (
        <FormControlLabel
          control={
            <Checkbox
              defaultChecked={false}
              onChange={(event) => {
                excludeActivated = event.target.checked;
              }}
            />
          }
          label={t("userTag.excludeActivated")}
        />
      ),
      onConfirm: () => {
        void downloadCsv(excludeActivated);
        return true;
      },
    });
  };

  const actions: LayoutAction[] = [
    {
      label: t("userTag.exportCsv"),
      onClick: handleExport,
      icon: <FileDownloadIcon />,
    },
  ];

  return (
    <DetailLayout title={t("userTag.find")} actions={actions}>
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
