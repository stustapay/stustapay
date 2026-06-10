import * as React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { ErrorPage } from "./ErrorPage";
import { Agb } from "./routes/Agb";
import { Login } from "./routes/auth/Login";
import { AuthenticatedRoot } from "./routes/AuthenticatedRoot";
import { Bon } from "./routes/Bon";
import { Faq } from "./routes/Faq";
import { Index } from "./routes/Index";
import { PayoutInfo } from "./routes/PayoutInfo";
import { PrivacyPolicy } from "./routes/PrivacyPolicy";
import { TopUp } from "./routes/topup";
import { UnauthenticatedRoot } from "./routes/UnauthenticatedRoot";

const router = createBrowserRouter([
  {
    path: "/bon/:orderUUID",
    element: <Bon />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/",
    element: <AuthenticatedRoot />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "",
        element: <Index />,
      },
      {
        path: "payout-info",
        element: <PayoutInfo />,
      },
      {
        path: "topup",
        element: <TopUp />,
      },
    ],
  },
  {
    element: <UnauthenticatedRoot />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/faq",
        element: <Faq />,
      },
      {
        path: "/agb",
        element: <Agb />,
      },
      {
        path: "/privacypolicy",
        element: <PrivacyPolicy />,
      },
    ],
  },
]);

export const Router: React.FC = () => {
  return <RouterProvider router={router} />;
};
