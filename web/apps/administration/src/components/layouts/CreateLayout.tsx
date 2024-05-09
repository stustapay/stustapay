import { ChangeLayout, ChangeLayoutProps } from "./ChangeLayout";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FormObject = Record<string, any>;

export type CreateLayoutProps<T extends FormObject> = ChangeLayoutProps<T>;

export function CreateLayout<T extends FormObject>(props: CreateLayoutProps<T>) {
  return <ChangeLayout {...props} />;
}
