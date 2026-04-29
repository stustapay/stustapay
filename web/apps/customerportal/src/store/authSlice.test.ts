import { authSlice, forceLogout, initialAuthState, migrateAuthState, setAuthenticatedSession, shouldResetPersistedPortalAuth } from "./authSlice";

jest.mock("@/api", () => ({
  api: {
    endpoints: {
      logout: {
        matchFulfilled: () => false,
        matchRejected: () => false,
      },
    },
  },
}));

describe("authSlice", () => {
  test("stores the portal-bound session on successful login", () => {
    const state = authSlice.reducer(
      initialAuthState,
      setAuthenticatedSession({
        token: "token-123",
        portalNodeId: 42,
      })
    );

    expect(state).toEqual({
      token: "token-123",
      portalNodeId: 42,
    });
  });

  test("clears token and portal binding on forced logout", () => {
    const state = authSlice.reducer(
      {
        token: "token-123",
        portalNodeId: 42,
      },
      forceLogout()
    );

    expect(state).toEqual(initialAuthState);
  });

  test("rejects persisted auth state that is missing the portal binding", () => {
    expect(
      migrateAuthState({
        token: "token-123",
      })
    ).toEqual(initialAuthState);
  });

  test("keeps persisted auth state when token and portal binding are present", () => {
    expect(
      migrateAuthState({
        token: "token-123",
        portalNodeId: 42,
      })
    ).toEqual({
      token: "token-123",
      portalNodeId: 42,
    });
  });

  test("requests auth reset when the current portal node does not match", () => {
    expect(shouldResetPersistedPortalAuth("token-123", 42, 7)).toBe(true);
    expect(shouldResetPersistedPortalAuth("token-123", 42, 42)).toBe(false);
    expect(shouldResetPersistedPortalAuth(null, null, 42)).toBe(false);
  });
});
