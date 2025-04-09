import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLoginMutation } from "@/api";
import { config } from "@/api/common"; // Import directly from common
import { toast } from "react-toastify";

export const QRCodeLogin: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [login] = useLoginMutation();

  // Extract the pin from the query params
  const pin = searchParams.get("pin");
  const username = searchParams.get("id");
  
  React.useEffect(() => {
    if (!pin || !username) {
      toast.error("Invalid QR code, missing PIN or username.");
      navigate("/login"); // Redirect to login if there's no pin
      return;
    }

    // Perform the login with the pin and node_id from config
    login({ 
      loginPayload: { 
        username, 
        pin,
        node_id: config.apiConfig.node_id // Access the node_id from the config
      } 
    })
      .unwrap()
      .then(() => {
        navigate("/"); // Redirect to the home page on success
      })
      .catch((err) => {
        console.error(err);
        toast.error("QR code login failed");
        navigate("/login"); // Redirect to login on failure
      });
  }, [username, pin, login, navigate]);

  return <div>Logging in with QR code...</div>;
};
