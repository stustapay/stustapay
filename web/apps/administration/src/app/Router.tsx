import * as React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ErrorPage } from "./ErrorPage";
import { PointOfSaleList } from "./routes/point-of-sales/PointOfSaleList";
import { PointOfSaleDetail } from "./routes/point-of-sales/PointOfSaleDetail";
import { ProductDetail } from "./routes/products/ProductDetail";
import { ProductList } from "./routes/products/ProductList";
import { Root } from "./routes/Root";
import { CashierList } from "./routes/cashiers/CashierList";
import { CashierDetail } from "./routes/cashiers/CashierDetail";

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
        path: "products/:productId",
        element: <ProductDetail />,
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
    ],
  },
]);

export const Router: React.FC = () => {
  return <RouterProvider router={router} />;
};
