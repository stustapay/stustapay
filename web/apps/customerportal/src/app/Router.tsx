import * as React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ErrorPage } from "./ErrorPage";
import { AuthenticatedRoot } from "./routes/AuthenticatedRoot";
import { Login } from "./routes/auth/Login";
import { QRCodeLogin } from "./routes/auth/QRCodeLogin";
import { PublicRoot } from "./routes/PublicRoot";
import { Index } from "./routes/Index";
import { PayoutInfo } from "./routes/PayoutInfo";
import { SharedTopUpOwner, TopUp } from "./routes/topup";
import { SharedTopUp } from "./routes/topup/SharedTopUp";
import { Faq } from "./routes/Faq";
import { Agb } from "./routes/Agb";
import { PrivacyPolicy } from "./routes/PrivacyPolicy";
import { Impressum } from "./routes/Impressum";
import { Bon } from "./routes/Bon";

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
      {
        path: "topup/shared",
        element: <SharedTopUpOwner />,
      },
    ],
  },
  {
    element: <PublicRoot />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/login/qr",
        element: <QRCodeLogin />, // This is the new component for QR code login
      },
      {
        path: "/shared-topup/:sharedTopupToken",
        element: <SharedTopUp />,
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
        path: "datenschutz",
        element: <PrivacyPolicy />,
      },
      {
        path: "/impressum",
        element: <Impressum />,
      },
    ],
  },
]);

export const Router: React.FC = () => {
  return <RouterProvider router={router} />;
};
