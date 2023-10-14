import { ProductRestriction } from "@/api";
import { Select, SelectProps } from "@stustapay/components";
import { ProductRestrictions } from "@stustapay/models";

export type RestrictionSelectProps<Multiple extends boolean> = Omit<
  SelectProps<ProductRestriction, ProductRestriction, Multiple>,
  "options" | "formatOption" | "getOptionKey"
>;

export function RestrictionSelect<Multiple extends boolean>(props: RestrictionSelectProps<Multiple>) {
  return (
    <Select
      checkboxes={true}
      options={ProductRestrictions}
      getOptionKey={(restriction: ProductRestriction) => restriction}
      formatOption={(restriction: ProductRestriction) => restriction}
      {...props}
    />
  );
}
