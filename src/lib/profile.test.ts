import { expect } from "chai";

import { fromDatabaseProfileRow, resolveOwnerDisplayName } from "./profile.ts";

describe("profile helpers", () => {
  it("normalizes snake_case profile rows into the app profile shape", () => {
    const profile = fromDatabaseProfileRow({
      user_id: "user-1",
      display_name: "Giancarlo",
      created_at: "2026-05-26T12:00:00.000Z",
      updated_at: "2026-05-26T12:05:00.000Z"
    });

    expect(profile.userId).to.equal("user-1");
    expect(profile.displayName).to.equal("Giancarlo");
    expect(profile.updatedAt).to.equal("2026-05-26T12:05:00.000Z");
  });

  it("prefers the saved profile name over the wallet fallback", () => {
    expect(
      resolveOwnerDisplayName({
        profile: {
          userId: "user-1",
          displayName: "Giancarlo",
          createdAt: "2026-05-26T12:00:00.000Z",
          updatedAt: "2026-05-26T12:05:00.000Z"
        },
        walletAddress: "0x1234"
      })
    ).to.equal("Giancarlo");
  });

  it("falls back to the wallet address when no saved name exists", () => {
    expect(
      resolveOwnerDisplayName({
        profile: null,
        walletAddress: "0x1234"
      })
    ).to.equal("0x1234");
  });
});
