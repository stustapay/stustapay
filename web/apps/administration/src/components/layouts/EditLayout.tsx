import { ChangeLayout, ChangeLayoutProps } from "./ChangeLayout";

export type EditLayoutProps<T extends Record<string, any>> = ChangeLayoutProps<T>;

export function EditLayout<T extends Record<string, any>>(props: EditLayoutProps<T>) {
  return <ChangeLayout {...props} />;
}
