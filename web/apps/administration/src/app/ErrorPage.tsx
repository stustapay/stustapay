import * as React from "react";
import { isRouteErrorResponse, useRouteError } from "react-router-dom";

export const ErrorPage: React.FC = () => {
  const error = useRouteError();
  console.error(error);

  return (
    <div>
      <h1>Oops!</h1>
      <p>Sorry, an unexpected error has occured.</p>
      <p>
        {isRouteErrorResponse(error) ? (
          <i>{error.statusText}</i>
        ) : error instanceof Error ? (
          <i>{error.message}</i>
        ) : (
          <i>unknown error</i>
        )}
      </p>
    </div>
  );
};
