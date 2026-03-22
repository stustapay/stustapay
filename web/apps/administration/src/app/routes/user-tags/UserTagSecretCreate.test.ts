import { generateUserTagSecretKeys } from "./userTagSecretKeys";

describe("generateUserTagSecretKeys", () => {
  test("generates two 16-byte hex keys", () => {
    let callCount = 0;
    const cryptoStub = {
      getRandomValues: (target: Uint8Array) => {
        target.forEach((_, index) => {
          target[index] = callCount === 0 ? index : 255 - index;
        });
        callCount += 1;
        return target;
      },
    };

    const generated = generateUserTagSecretKeys(cryptoStub);

    expect(generated.key0).toBe("000102030405060708090a0b0c0d0e0f");
    expect(generated.key1).toBe("fffefdfcfbfaf9f8f7f6f5f4f3f2f1f0");
  });
});
