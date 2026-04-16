import { describe, it, expect, vi } from "vitest";
import Project from "../src/Project/Project";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { Workspace } from "../src/slim";
import { EpanetEngine as EpanetEngineV20200 } from "../src/engines/v2.2";
import { EpanetEngine as EpanetEngineV20300 } from "../src/engines/v2.3";


describe("EPANET Version Guarding", () => {
  it("should initialize successfully with required baseline version", async () => {
    const workspace = new Workspace();
    await workspace.loadModuleVersion(EpanetEngineV20200);
    expect(() => new Project(workspace)).not.toThrow();
  });

  it("should initialize successfully with a newer version", async () => {
    const workspace = new Workspace();
    workspace.loadModuleVersion(EpanetEngineV20300);
    expect(() => new Project(workspace)).not.toThrow();
  });

  it.skip("should throw error if version is below absolute minimum", async () => {
    // We decide which EPANET versions are exported, this shouldn't be possible
    // const workspace = new Workspace(oldVersion);
    // expect(() => new Project(workspace)).toThrow(/EPANET Version Too Low/);
  });

  it("should allow calling baseline functions with baseline version", async () => {
    const workspace = new Workspace();
    await workspace.loadModuleVersion(EpanetEngineV20200);
    const project = new Project(workspace);
    expect(() => project.close()).not.toThrow();
  });

  it("should allow calling baseline functions with newer version", async () => {
    const workspace = new Workspace();
    await workspace.loadModuleVersion(EpanetEngineV20300);
    const project = new Project(workspace);
    expect(() => project.close()).not.toThrow();
  });

  it("should THROW when calling version-specific function with baseline version", async () => {
    const workspace = new Workspace();
    await workspace.loadModuleVersion(EpanetEngineV20200);
    const project = new Project(workspace);
    expect(() =>
      project.openX("net.inp", "net.rpt", "net.bin"),
    ).toThrow(/Method 'openX' requires EPANET v2\.3\.0.*loaded is v2\.2\.0/);
  });

  it("should ALLOW calling version-specific function with required version", async () => {
    const workspace = new Workspace();
    await workspace.loadModuleVersion(EpanetEngineV20300);
    const project = new Project(workspace);

    workspace.writeFile("net.inp", "");

    expect(() => project.openX("net.inp", "net.rpt", "net.bin")).not.toThrow();
  });

  it("should throw if underlying WASM function is missing", async () => {
    const workspace = new Workspace();
    await workspace.loadModuleVersion(EpanetEngineV20300);
    // @ts-expect-error
    delete workspace.instance._EN_open;

    const project = new Project(workspace);
    expect(() => project.open("net.inp", "net.rpt", "net.bin")).toThrow(
      /EPANET function '_EN_open' \(for method 'open'\) not found/,
    );
  });
});

beforeAll(() => {
  vi.stubGlobal("fetch", async (url: string) => {
    const filePath = fileURLToPath(url);
    const nodeBuffer = readFileSync(filePath);
    const arrayBuffer = nodeBuffer.buffer.slice(
      nodeBuffer.byteOffset,
      nodeBuffer.byteOffset + nodeBuffer.byteLength
    );
    return {
      ok: true,
      arrayBuffer: () => Promise.resolve(arrayBuffer),
    };
  });
});

