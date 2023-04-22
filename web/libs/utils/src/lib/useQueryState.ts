import * as React from "react";
import { z } from "zod";
import { useSearchParams } from "react-router-dom";

export const StringyBoolean = z.preprocess(
  (val) => (typeof val === "string" ? val.toLowerCase() : val),
  z.enum(["0", "1", "false", "true"]).transform((val) => val === "true" || val === "1")
);

export const useQueryState = <T extends Record<string, boolean | string | number>>(
  initialState: T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: z.ZodType<T, any, any>
): [T, (val: T) => void] => {
  const [searchParams, setSearchParams] = useSearchParams();

  const updateState = React.useCallback(
    (newState: T) => {
      setSearchParams((prevState) => ({
        ...Object.fromEntries(prevState.entries()),
        ...newState,
      }));
    },
    [setSearchParams]
  );

  const searchAsObject = Object.fromEntries(searchParams.entries());
  const parsedQuery = schema.safeParse(searchAsObject);

  const state = parsedQuery.success ? parsedQuery.data : initialState;

  return [state, updateState];
};
