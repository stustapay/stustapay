import { useTranslation } from "react-i18next";
import { ChangeLayout, ChangeLayoutProps } from "./ChangeLayout";

export type EditLayoutProps<T extends Record<string, any>> = Omit<ChangeLayoutProps<T>, "submitLabel">;

export function EditLayout<T extends Record<string, any>>(props: EditLayoutProps<T>) {
  const { t } = useTranslation();
  return <ChangeLayout submitLabel={t("update")} {...props} />;
}
