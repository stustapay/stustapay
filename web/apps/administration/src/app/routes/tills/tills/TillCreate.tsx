import { TillRoutes } from "@/app/routes";
import { useCreateTillMutation } from "@api";
import { CreateLayout } from "@components";
import { useCurrentNode } from "@hooks";
import { NewTill, NewTillSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { TillForm } from "./TillForm";

const initialValues: NewTill = {
  name: "",
  description: "",
  active_user_id: undefined,
  active_profile_id: undefined as unknown as number, // to circument typescript
  active_shift: undefined,
};

export const TillCreate: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [createTill] = useCreateTillMutation();

  return (
    <CreateLayout
      title={t("till.create")}
      submitLabel={t("add")}
      successRoute={TillRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewTillSchema}
      onSubmit={(till) => createTill({ nodeId: currentNode.id, newTill: till })}
      form={TillForm}
    />
  );
};
