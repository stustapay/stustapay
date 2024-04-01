import { useCurrentEventSettings } from "./useCurrentEventSettings";

export const useCurrencyIdentifier = () => {
  const { eventSettings } = useCurrentEventSettings();
  return eventSettings.currency_identifier;
};
