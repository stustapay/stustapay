import { type Translations } from "../en/translations";

type NestedPartialAsStrings<T extends object> = {
  [Key in keyof T]?: T[Key] extends string ? string : T[Key] extends object ? NestedPartialAsStrings<T[Key]> : never;
};

export const translations: NestedPartialAsStrings<Translations> = {
  order: {
    orderType: {
      sale: "Kauf",
      cancel_sale: "Stornierter Kauf",
      top_up: "Aufladung",
      pay_out: "Auszahlung",
      ticket: "Ticketkauf",
    },
  },
} as const;

export default translations;
