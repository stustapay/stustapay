import { NewTseSchema } from "@stustapay/models";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { TseRoutes } from "@/app/routes";
import { CreateLayoutV2 } from "@/components";
import { NewTse } from "@/db/api/generated";
import { generateId, getTseCollection } from "@/db/collections";
import { useCurrentNode } from "@/hooks";

import { TseForm } from "./TseForm";

const initialValues: NewTse = {
  name: "",
  type: "diebold_nixdorf",
  serial: "",
  ws_url: "",
  ws_timeout: 5,
  password: "",
  first_operation: null,
};

export const TseCreate: React.FC = () => {
  const { t } = useTranslation();
  const { currentNode } = useCurrentNode();

  return (
    <CreateLayoutV2
      title={t("tse.create")}
      successRoute={TseRoutes.list()}
      initialValues={initialValues}
      validationSchema={NewTseSchema}
      onSubmit={(tse) =>
        getTseCollection(currentNode.id).insert({
          ...tse,
          id: generateId(),
          node_id: currentNode.id,
          status: "new",
          hashalgo: null,
          time_format: null,
          public_key: null,
          certificate: null,
          process_data_encoding: null,
          tse_description: null,
          certificate_date: null,
        })
      }
      form={TseForm}
    />
  );
};
