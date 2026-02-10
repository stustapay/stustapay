import * as React from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useLoginMutation } from "@/api";
import { config } from "@/api/common"; // Import directly from common
import { toast } from "react-toastify";

export const QRCodeLogin: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [login] = useLoginMutation();
  const [credentials] = React.useState(() => ({
    pin: searchParams.get("pin"),
    username: searchParams.get("id"),
  }));

  React.useEffect(() => {
    if (location.search.length > 0) {
      navigate({ pathname: "/login/qr", search: "" }, { replace: true });
    }
  }, [location.search, navigate]);

  React.useEffect(() => {
    const { pin, username } = credentials;
    if (!pin || !username) {
      toast.error("Invalid QR code, missing PIN or username.");
      navigate("/login", { replace: true });
      return;
    }

    login({
      loginPayload: {
        username,
        pin,
        node_id: config.apiConfig.node_id,
      },
    })
      .unwrap()
      .then(() => {
        navigate("/", { replace: true });
      })
      .catch((err) => {
        console.error(err);
        toast.error("QR code login failed");
        navigate("/login", { replace: true });
      });
  }, [credentials, login, navigate]);

  return <div>Logging in with QR code...</div>;
};
