import { useCreateTillMutation } from "@/api";
import { TillRoutes } from "@/app/routes";
import { CreateLayout } from "@/components";
import { useCurrentNode } from "@/hooks";
import { NewTill, NewTillSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { TillForm } from "./TillForm";
import { withPrivilegeGuard } from "@/app/layout";

const initialValues: NewTill = {
  name: "",
  description: "",
  active_user_id: undefined,
  active_profile_id: undefined as unknown as number, // to circument typescript
  active_shift: undefined,
};

export const TillCreate: React.FC = withPrivilegeGuard("node_administration", () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();
  const [createTill] = useCreateTillMutation();

  return (
    <CreateLayout
      title={t("till.create")}
      successRoute={TillRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewTillSchema}
      onSubmit={(till) => createTill({ nodeId: currentNode.id, newTill: till })}
      form={TillForm}
    />
  );
});
