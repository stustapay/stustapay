import { config } from "@/api/common";
import { useCallback } from "react";

export const useCurrencyFormatter = () => {
    return useCallback((amount: number) => {
        // Basic implementation - ideally this would use the currency from config
        // assuming EUR for now or grabbing from config if available
        const currency = config.apiConfig?.currency_identifier === "EUR" ? "EUR" : "EUR";

        return new Intl.NumberFormat("de-DE", {
            style: "currency",
            currency: currency,
        }).format(amount);
    }, []);
};
