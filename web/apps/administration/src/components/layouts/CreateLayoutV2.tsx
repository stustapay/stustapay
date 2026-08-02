import * as React from "react";
import { useTranslation } from "react-i18next";

import { ChangeLayoutV2, ChangeLayoutV2Props } from "./ChangeLayoutV2";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FormObject = Record<string, any>;

export type CreateLayoutV2Props<T extends FormObject> = Omit<
  ChangeLayoutV2Props<T>,
  "submitLabel" | "saveAndClearLabel"
>;

export function CreateLayoutV2<T extends FormObject>({ ...props }: CreateLayoutV2Props<T>) {
  const { t } = useTranslation();
  return <ChangeLayoutV2 submitLabel={t("save")} saveAndClearLabel={t("saveAndAddAnother")} {...props} />;
}
