import * as React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ErrorPage } from "./ErrorPage";
import { PointOfSaleList } from "./routes/point-of-sales/PointOfSaleList";
import { PointOfSaleDetail } from "./routes/point-of-sales/PointOfSaleDetail";
import { ProductCreate } from "./routes/products/ProductCreate";
import { ProductUpdate } from "./routes/products/ProductUpdate";
import { ProductList } from "./routes/products/ProductList";
import { TaxRateCreate } from "./routes/tax-rates/TaxRateCreate";
import { TaxRateUpdate } from "./routes/tax-rates/TaxRateUpdate";
import { TaxRateList } from "./routes/tax-rates/TaxRateList";
import { Root } from "./routes/Root";
import { CashierList } from "./routes/cashiers/CashierList";
import { CashierDetail } from "./routes/cashiers/CashierDetail";
import { Settings } from "./routes/settings/Settings";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "products",
        element: <ProductList />,
      },
      {
        path: "products/new",
        element: <ProductCreate />,
      },
      {
        path: "products/:productId/edit",
        element: <ProductUpdate />,
      },
      {
        path: "tax-rates",
        element: <TaxRateList />,
      },
      {
        path: "tax-rates/new",
        element: <TaxRateCreate />,
      },
      {
        path: "tax-rates/:taxRateName/edit",
        element: <TaxRateUpdate />,
      },
      {
        path: "point-of-sales",
        element: <PointOfSaleList />,
      },
      {
        path: "point-of-sales/:pointOfSaleId",
        element: <PointOfSaleDetail />,
      },
      {
        path: "cashiers",
        element: <CashierList />,
      },
      {
        path: "cashiers/:cashierId",
        element: <CashierDetail />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
    ],
  },
]);

export const Router: React.FC = () => {
  return <RouterProvider router={router} />;
};
