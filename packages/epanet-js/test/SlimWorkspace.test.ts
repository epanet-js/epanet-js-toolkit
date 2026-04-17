import { vi, beforeAll, test, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { Workspace } from "../src/slim";

const VERSIONS = [
  'v2.2',
  'v2.3',
  'v2.3.1',
  'v2.3.2',
  'v2.3.3',
  'v2.3.4',
  'v2.3.5',
  'master',
  'dev',
  'v2.2-msx',
  'v2.3-msx',
  'v2.3.1-msx',
  'v2.3.2-msx',
  'v2.3.3-msx',
  'v2.3.4-msx',
  'v2.3.5-msx',
  'master-msx',
  'dev-msx'
];

const ENGINE_VERSIONS: { [k: string]: number } = {
  'v2.2': 20200,
  'v2.3': 20300,
  'v2.3.1': 20301,
  'v2.3.2': 20302,
  'v2.3.3': 20303,
  'v2.3.4': 20304,
  'v2.3.5': 20305,
  'master': 20305,
  'dev': 20305,
  'v2.2-msx': 20200,
  'v2.3-msx': 20300,
  'v2.3.1-msx': 20301,
  'v2.3.2-msx': 20302,
  'v2.3.3-msx': 20303,
  'v2.3.4-msx': 20304,
  'v2.3.5-msx': 20305,
  'master-msx': 20305,
  'dev-msx': 20305,
};

describe.each(VERSIONS)("EPANET Version %s", (version) => {
  const workspace = new Workspace();
  test("Returns workspace version", async () => {
    const { EpanetEngine } = await import(`../src/engines/${version}`);
    await workspace.loadModuleVersion(EpanetEngine);
    expect(workspace.version).toBe(ENGINE_VERSIONS[version]);
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
