import { ChangeLayout, ChangeLayoutProps } from "./ChangeLayout";

export type CreateLayoutProps<T extends Record<string, any>> = ChangeLayoutProps<T>;

export function CreateLayout<T extends Record<string, any>>(props: CreateLayoutProps<T>) {
  return <ChangeLayout {...props} />;
}
