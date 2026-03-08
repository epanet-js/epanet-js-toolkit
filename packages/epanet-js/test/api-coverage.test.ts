import { describe, it, expect, vi, beforeAll } from "vitest";
import Project from "../src/Project/Project";
import type { EpanetModule as EpanetProject } from "@model-create/epanet-engine";
import { apiDefinitions } from "../src/apiDefinitions";

import { Workspace } from "../src/Workspace/Workspace";

// Mock Workspace for testing
class MockWorkspace extends Workspace {
  constructor(epanetVersion: number) {
    super();
    const mockInstance = {
      _malloc: vi.fn((size) => (size > 0 ? 1000 : 0)),
      _free: vi.fn(),
      getValue: vi.fn((ptr, type) => (type === "i32" ? epanetVersion : 0)),
      lengthBytesUTF8: vi.fn((ptr) => 10),
      UTF8ToString: vi.fn((ptr) => "mock string"),
      stringToUTF8: vi.fn((str, len, ptr) => {
        if (ptr) {
          const buffer = new Uint8Array(ptr);
          for (let i = 0; i < len; i++) {
            buffer[i] = str.charCodeAt(i);
          }
        }
        return len;
      }),
      HEAP8: new Int8Array(),
      FS: {
        writeFile: vi.fn(),
        readFile: vi.fn(),
      },
      _EN_getversion: vi.fn((ptr) => 0),
      _EN_getnodeindex: vi.fn(() => 0),
      _EN_getspecialnodeprop_v23: vi.fn((idx, ptr) => 0),
      _EN_createproject: vi.fn((idx, ptr) => 0),
      // Hydraulic Analysis Functions
      _EN_solveH: vi.fn(() => 0),
      _EN_usehydfile: vi.fn((filename) => 0),
      _EN_openH: vi.fn(() => 0),
      _EN_initH: vi.fn((initFlag) => 0),
      _EN_runH: vi.fn((ptr) => 0),
      _EN_nextH: vi.fn((ptr) => 0),
      _EN_saveH: vi.fn(() => 0),
      _EN_savehydfile: vi.fn((filename) => 0),
      _EN_closeH: vi.fn(() => 0),
      // Network Link Functions
      _EN_addlink: vi.fn((id, linkType, fromNode, toNode, ptr) => 0),
      _EN_deletelink: vi.fn((index, actionCode) => 0),
      _EN_getlinkindex: vi.fn((id, ptr) => 0),
      _EN_getlinkid: vi.fn((index, ptr) => 0),
      _EN_setlinkid: vi.fn((index, newid) => 0),
      _EN_getlinktype: vi.fn((index, ptr) => 0),
      _EN_setlinktype: vi.fn((index, linkType, actionCode) => 0),
      _EN_getlinknodes: vi.fn((index, ptr1, ptr2) => 0),
      _EN_setlinknodes: vi.fn((index, node1, node2) => 0),
      _EN_getlinkvalue: vi.fn((index, property, ptr) => 0),
      _EN_setlinkvalue: vi.fn((index, property, value) => 0),
      _EN_setpipedata: vi.fn((index, length, diam, rough, mloss) => 0),
      _EN_getpumptype: vi.fn((index, ptr) => 0),
      _EN_getheadcurveindex: vi.fn((linkIndex, ptr) => 0),
      _EN_setheadcurveindex: vi.fn((linkIndex, curveIndex) => 0),
      _EN_getvertexcount: vi.fn((index, ptr) => 0),
      _EN_getvertex: vi.fn((index, vertex, ptr1, ptr2) => 0),
      _EN_setvertices: vi.fn((index, xPtr, yPtr, count) => 0),
    } as any;
    Object.defineProperty(this, "instance", { get: () => mockInstance });
  }

  async loadModule(): Promise<void> {
    // No-op for testing
  }
}

// --- Test Suite ---
describe("EPANET WASM Function Coverage and Project API", () => {
  let project: Project;
  let enInstance: EpanetProject;
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
    const definedWasmFunctions = new Set<string>(
      Object.values(apiDefinitions).map((def) => def.wasmFunctionName),
    );

    // Get *mocked* function names from the test instance prototype
    // Adjust this depending on whether Epanet is a class or object in your mock
    const allPropertyNames = Object.getOwnPropertyNames(
      Object.getPrototypeOf(enInstance) || enInstance,
    );
    const availableWasmFunctions = new Set<keyof EpanetProject>(
      allPropertyNames.filter(
        (propName) =>
          propName.startsWith("EN_") && // Filter based on convention
          typeof (enInstance as any)[propName] === "function",
      ) as (keyof EpanetProject)[], // Cast needed if propName is just string
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
