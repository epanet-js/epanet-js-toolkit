import { describe, it, expect, beforeAll } from "vitest";
import Project from "../src/Project/Project";
import { apiDefinitions } from "../src/apiDefinitions";

import { Workspace } from "../src/Workspace/Workspace";
import { EpanetEngineAPI } from "@epanet-js/epanet-engine";

// --- Test Suite ---
describe("EPANET WASM Function Coverage and Project API", () => {
  let project: Project;
  let enInstance: EpanetEngineAPI;
  //let mockWorkspace: MockWorkspace;
  let ws: Workspace;

  //const baselineVersion = 20200;

  beforeAll(async () => {
    ws = new Workspace();
    await ws.loadModule();

    //mockWorkspace = new MockWorkspace(baselineVersion);
    project = new Project(ws);
    enInstance = (project as any)._EN;
  });

  it("should have definitions for all available relevant WASM functions", () => {
    const definedWasmFunctions = new Set<keyof EpanetEngineAPI>(
      Object.values(apiDefinitions).map((def) => def.wasmFunctionName),
    );

    // Get *mocked* function names from the test instance prototype
    // Adjust this depending on whether Epanet is a class or object in your mock
    const allPropertyNames = Object.getOwnPropertyNames(
      Object.getPrototypeOf(enInstance) || enInstance,
    );
    const availableWasmFunctions = new Set<keyof EpanetEngineAPI>(
      allPropertyNames.filter(
        (propName) =>
          propName.startsWith("_EN_") && // Filter based on convention
          typeof (enInstance as any)[propName] === "function",
      ) as (keyof EpanetEngineAPI)[], // Cast needed if propName is just string
    );

    // Find functions available in the mock but not defined
    const missingDefinitions = [...availableWasmFunctions].filter(
      (funcName) => !definedWasmFunctions.has(funcName),
    );

    //// Find functions defined but not available in the mock
    //// Note: This depends heavily on the completeness of your mock `enInstance`
    //const orphanedDefinitions = [...definedWasmFunctions].filter(
    //  (funcName) => !availableWasmFunctions.has(funcName),
    //);

    // Assertions
    expect(
      missingDefinitions,
      `WASM functions missing definitions: ${missingDefinitions.join(", ")}`,
    ).toHaveLength(0);

    // This assertion might be less reliable unless the mock is exhaustive
    //expect(
    //  orphanedDefinitions,
    //  `Definitions for non-existent WASM functions: ${orphanedDefinitions.join(
    //    ", ",
    //  )}`,
    //).toHaveLength(0);
  });

  it("should have all public methods defined in apiDefinitions implemented on Project instance", () => {
    const definedPublicMethods = Object.keys(apiDefinitions);
    const missingProjectMethods: string[] = [];
    definedPublicMethods.forEach((methodName) => {
      if (typeof (project as any)[methodName] !== "function") {
        missingProjectMethods.push(methodName);
      }
    });
    expect(
      missingProjectMethods,
      `Public methods missing on Project: ${missingProjectMethods.join(", ")}`,
    ).toHaveLength(0);
  });

  it.skip("should have all _EN functions on workspace instance defined in apiDefinitions", async () => {
    const workspace = new Workspace();
    await workspace.loadModule();

    const manuallyDefinedFunctions = [
      "_EN_getversion",
      "_EN_geterror",
      "_EN_createproject",
      "_EN_deleteproject",
      "_EN_getcurve", // Complex function handled manually
      "_EN_setlinktype",
    ];

    // Get all properties from workspace instance that start with _EN
    const allInstanceProperties = Object.getOwnPropertyNames(
      workspace.instance,
    );
    const enFunctions = allInstanceProperties.filter(
      (propName) =>
        propName.startsWith("_EN") &&
        typeof (workspace.instance as any)[propName] === "function",
    );

    // Get all wasm function names from apiDefinitions
    const definedWasmFunctions = new Set<string>(
      Object.values(apiDefinitions).map((def) => def.wasmFunctionName),
    );

    // Add manually defined functions to the set
    manuallyDefinedFunctions.forEach((funcName) => {
      definedWasmFunctions.add(funcName);
    });

    // Find functions on workspace instance that don't have corresponding definitions
    const missingDefinitions = enFunctions.filter(
      (funcName) => !definedWasmFunctions.has(funcName),
    );

    expect(
      missingDefinitions,
      `_EN functions missing from apiDefinitions: ${missingDefinitions.join(
        ", ",
      )}`,
    ).toHaveLength(0);
  });
});
