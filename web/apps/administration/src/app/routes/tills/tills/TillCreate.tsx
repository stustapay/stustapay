import { NewTill, NewTillSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { withPrivilegeGuard } from "@/app/layout";
import { TillRoutes } from "@/app/routes";
import { CreateLayoutV2 } from "@/components";
import { generateId, getTillCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { TillForm } from "./TillForm";

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

  return (
    <CreateLayoutV2
      title={t("till.create")}
      successRoute={TillRoutes.action("list")}
      initialValues={initialValues}
      validationSchema={NewTillSchema}
      onSubmit={(till) =>
        getTillCollection(currentNode.id).insert({
          ...till,
          id: generateId(),
          node_id: currentNode.id,
          z_nr: 0,
        })
      }
      form={TillForm}
    />
  );
});
