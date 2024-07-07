import * as React from "react";
import { NumberField, NumberFieldProps } from "react-admin";

export type CurrencyFieldProps = NumberFieldProps;

export const CurrencyField: React.FC<CurrencyFieldProps> = ({ options, ...props }) => {
  return <NumberField {...props} options={{ style: "currency", currency: "EUR", ...options }} />;
};
