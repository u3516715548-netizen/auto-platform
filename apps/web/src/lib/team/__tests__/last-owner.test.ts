import { describe, expect, it } from "vitest";

/** Mirrors server-side last-owner protection used by change/remove actions. */
function canMutateOwnerMembership(ownerCount: number): boolean {
  return ownerCount > 1;
}

describe("last owner protection", () => {
  it("blocks demote/remove when sole owner", () => {
    expect(canMutateOwnerMembership(1)).toBe(false);
    expect(canMutateOwnerMembership(0)).toBe(false);
  });

  it("allows demote/remove when another owner remains", () => {
    expect(canMutateOwnerMembership(2)).toBe(true);
  });
});
