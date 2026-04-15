import { describe, it, expect, vi } from "vitest";
import Project from "../src/Project/Project";
import { Workspace } from "../src/Workspace/Workspace";

// Helper to create a Mock Workspace with a specific EPANET version
class MockWorkspace extends Workspace {
  constructor(epanetVersion: number) {
    super();
    const mockInstance = {
      _malloc: vi.fn((size) => (size > 0 ? 1000 : 0)),
      _free: vi.fn(),
      getValue: vi.fn((_ptr, type) => (type === "i32" ? epanetVersion : 0)),
      lengthBytesUTF8: vi.fn((_ptr) => 10),
      UTF8ToString: vi.fn((_ptr) => "mock string"),
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
      _EN_getversion: vi.fn((_ptr) => 0),
      _EN_getnodeindex: vi.fn(() => 0),
      _EN_getspecialnodeprop_v23: vi.fn((_idx, _ptr) => 0),
      _EN_createproject: vi.fn((_idx, _ptr) => 0),
    } as any;
    Object.defineProperty(this, "instance", { get: () => mockInstance });
  }

  async loadModule(): Promise<void> {
    // No-op for testing
  }
}

// --- Test Suite ---
describe.skip("EPANET Version Guarding", () => {
  // Use version integers as defined in Project.ts / apiDefinitions
  const baselineVersion = 20200; // e.g., 2.2.0
  const nextVersion = 20300; // e.g., 2.3.0
  const oldVersion = 20100; // e.g., 2.1.0

  it("should initialize successfully with required baseline version", () => {
    const workspace = new MockWorkspace(baselineVersion);
    expect(() => new Project(workspace)).not.toThrow();
  });

  it("should initialize successfully with a newer version", () => {
    const workspace = new MockWorkspace(nextVersion);
    expect(() => new Project(workspace)).not.toThrow();
  });

  it("should throw error if version is below absolute minimum", () => {
    const workspace = new MockWorkspace(oldVersion);
    expect(() => new Project(workspace)).toThrow(/EPANET Version Too Low/);
  });

  it("should allow calling baseline functions with baseline version", () => {
    const workspace = new MockWorkspace(baselineVersion);
    const project = new Project(workspace);
    expect(() => project.getNodeIndex("N1")).not.toThrow();
  });

  it("should allow calling baseline functions with newer version", () => {
    const workspace = new MockWorkspace(nextVersion);
    const project = new Project(workspace);
    expect(() => project.getNodeIndex("N1")).not.toThrow();
  });

  it.skip("should THROW when calling version-specific function with baseline version", () => {
    const workspace = new MockWorkspace(baselineVersion);
    const project = new Project(workspace);
    const v23MethodName = "openX";
    expect(() =>
      project[v23MethodName]("net.inp", "net.rpt", "net.bin"),
    ).toThrow(/Method 'openX' requires EPANET v2\.3\.0.*loaded is v2\.2\.0/);
  });

  it.skip("should ALLOW calling version-specific function with required version", () => {
    const workspace = new MockWorkspace(nextVersion);
    const project = new Project(workspace);
    const v23MethodName = "openX";
    expect(() => (project as any)[v23MethodName](1)).not.toThrow();
  });

  it.skip("should throw if underlying WASM function is missing", () => {
    const workspace = new MockWorkspace(nextVersion);
    const mockInstance = workspace.instance;
    delete (mockInstance as any)._EN_getspecialnodeprop_v23;
    const project = new Project(workspace);
    const v23MethodName = "openX";
    expect(() => (project as any)[v23MethodName](1)).toThrow(
      /EPANET function '_EN_openX' \(for method 'openX'\) not found/,
    );
  });
});
