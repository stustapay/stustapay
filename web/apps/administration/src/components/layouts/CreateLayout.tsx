import { useTranslation } from "react-i18next";
import { ChangeLayout, ChangeLayoutProps } from "./ChangeLayout";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FormObject = Record<string, any>;

export type CreateLayoutProps<T extends FormObject> = Omit<ChangeLayoutProps<T>, "submitLabel" | "saveAndClearLabel">;

export function CreateLayout<T extends FormObject>({ ...props }: CreateLayoutProps<T>) {
  const { t } = useTranslation();
  return <ChangeLayout submitLabel={t("save")} saveAndClearLabel={t("saveAndAddAnother")} {...props} />;
}
