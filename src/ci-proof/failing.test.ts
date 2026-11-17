// CI proof: a failing unit test.
import { expect, test } from "vitest";

test("CI proof: this test fails on purpose", () => {
  expect(1 + 1).toBe(3);
});
