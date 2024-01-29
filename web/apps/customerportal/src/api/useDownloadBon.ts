import { config } from "@/api/common";
import { useAppSelector } from "@/store";
import * as React from "react";
import { toast } from "react-toastify";

export const fetchBon = async (accessToken: string, bonId: number): Promise<string> => {
  const resp = await fetch(`${config.customerApiBaseUrl}/bon/${bonId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!resp.ok) {
    throw new Error("Error on fetching file");
  }
  try {
    const blob = await resp.blob();
    return URL.createObjectURL(blob);
  } catch (e) {
    console.warn("Error on fetching file, no blob", e);
    throw new Error("Error on fetching file, no blob");
  }
};

export const useDownloadBon = () => {
  const accessToken = useAppSelector((state) => state.auth.token);

  return React.useCallback(
    async (bonId: number) => {
      if (accessToken == null) {
        return;
      }
      try {
        const bonUrl = await fetchBon(accessToken, bonId);
        const link = document.createElement("a");
        link.setAttribute("href", bonUrl);
        link.setAttribute("target", "blank");
        link.setAttribute("rel", "noopener");
        link.click();
        link.remove();
      } catch (e) {
        toast.error(String(e));
      }
    },
    [accessToken]
  );
};
