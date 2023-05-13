import { isRejectedWithValue } from "@reduxjs/toolkit";
import type { MiddlewareAPI, Middleware } from "@reduxjs/toolkit";
import { toast } from "react-toastify";
import { z } from "zod";
import { forceLogout } from "./authSlice";

const ErrorSchema = z.object({
  status: z.number(),
  data: z.object({ id: z.string(), type: z.string(), message: z.string() }),
});

export const errorMiddleware: Middleware = (api: MiddlewareAPI) => (next) => (action) => {
  // RTK Query uses `createAsyncThunk` from redux-toolkit under the hood, so we"re able to utilize these matchers!
  if (isRejectedWithValue(action)) {
    const parsed = ErrorSchema.safeParse(action.payload);
    if (parsed.success) {
      const msg = `${parsed.data.status}: ${parsed.data.data.message}`;
      console.error(msg);
      toast.error(msg);
      if (parsed.data.status === 401) {
        api.dispatch(forceLogout());
      }
    } else {
      console.error("unable to parse error payload", action);
    }
  }

  return next(action);
};
