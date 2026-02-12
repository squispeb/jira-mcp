import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AuthLayout } from "./ui/layout";
import { LoginPage } from "./ui/login-page";
import { RegisterPage } from "./ui/register-page";
import { McpTestPage } from "./ui/mcp-test-page";
import "./styles.css";

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <AuthLayout />,
      children: [
        {
          index: true,
          element: <Navigate to="/sign-up" replace />,
        },
        {
          path: "sign-up",
          element: <RegisterPage />,
        },
        {
          path: "token",
          element: <LoginPage />,
        },
        {
          path: "mcp-test",
          element: <McpTestPage />,
        },
      ],
    },
  ],
  {
    basename: "/auth",
  },
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
