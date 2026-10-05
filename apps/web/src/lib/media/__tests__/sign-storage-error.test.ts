import { describe, expect, it } from "vitest";
import { formatStorageError } from "../sign-storage-url";

describe("formatStorageError", () => {
  it("surfaces Storage RLS message without URLs", () => {
    expect(
      formatStorageError(
        { message: "new row violates row-level security policy", status: 400 },
        "fallback",
      ),
    ).toBe("new row violates row-level security policy (400)");
  });

  it("strips embedded URLs from messages", () => {
    expect(
      formatStorageError(
        { message: "failed https://xyz.supabase.co/storage/v1/object/upload/sign/x?token=abc" },
        "fallback",
      ),
    ).toBe("failed [url]");
  });
});
