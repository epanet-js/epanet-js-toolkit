import { test, expect } from "vitest";
import { Workspace } from "../src";

const workspace = new Workspace();
test("Returns workspace version", async () => {
  await workspace.loadModule();
  expect(workspace.version).toBe(20305);
});

test("Returns an error", () => {
  expect(workspace.getError(201)).toBe("Error 201: syntax error");
});

test("Read and write a file", () => {
  const multiLine = `Test File
  New Line`;
  workspace.writeFile("test.inp", multiLine);
  const result = workspace.readFile("test.inp");

  expect(result).toBe(multiLine);
});
