import { ConnectivitySettingsSchema } from "./TabMdm.schema";

describe("ConnectivitySettingsSchema", () => {
  test("accepts empty Wi-Fi settings", () => {
    expect(ConnectivitySettingsSchema.parse({ wifi_ssid: "", wifi_passphrase: "" })).toEqual({
      wifi_ssid: "",
      wifi_passphrase: "",
    });
  });

  test("rejects partial Wi-Fi settings", () => {
    expect(() => ConnectivitySettingsSchema.parse({ wifi_ssid: "festival", wifi_passphrase: "" })).toThrow();
  });

  test("accepts complete Wi-Fi settings", () => {
    expect(
      ConnectivitySettingsSchema.parse({
        wifi_ssid: "festival",
        wifi_passphrase: "secret1234",
      })
    ).toEqual({
      wifi_ssid: "festival",
      wifi_passphrase: "secret1234",
    });
  });
});
