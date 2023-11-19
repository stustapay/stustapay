import { ProductRestriction } from "@/api";
import { Select, SelectProps } from "@stustapay/components";
import { ProductRestrictions } from "@stustapay/models";

export type RestrictionSelectProps<Multiple extends boolean> = Omit<
  SelectProps<ProductRestriction, Multiple>,
  "options" | "formatOption"
>;

export function RestrictionSelect<Multiple extends boolean>(props: RestrictionSelectProps<Multiple>) {
  return (
    <Select
      checkboxes={true}
      options={ProductRestrictions}
      formatOption={(restriction: ProductRestriction) => restriction}
      {...props}
    />
  );
}
