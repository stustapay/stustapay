import * as React from "react";
import { useTranslation } from "react-i18next";

import { ChangeLayoutV2, ChangeLayoutV2Props } from "./ChangeLayoutV2";

export type EditLayoutV2Props<T extends Record<string, any>> = Omit<ChangeLayoutV2Props<T>, "submitLabel">;

export function EditLayoutV2<T extends Record<string, any>>(props: EditLayoutV2Props<T>) {
  const { t } = useTranslation();
  return <ChangeLayoutV2 submitLabel={t("update")} {...props} />;
}
