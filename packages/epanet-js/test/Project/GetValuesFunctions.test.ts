import { Project, Workspace } from "../../src";
import { Workspace as SlimWorkspace } from "../../src/slim";
import EpanetV22 from "@epanet-js/epanet-engine/v2.2";
import { CountType, LinkProperty, NodeProperty } from "../../src/enum";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const net1 = readFileSync(join(__dirname, "../data/net1.inp"), "utf8");

const ws = new Workspace();
await ws.loadModule();

describe("getLinkValues", () => {
  let model: Project;

  beforeEach(() => {
    model = new Project(ws);
    ws.writeFile("net1.inp", net1);
    model.open("net1.inp", "report.rpt", "out.bin");
  });

  afterEach(() => {
    model.close();
  });

  test("should return the same values as getLinkValue called per link", () => {
    const linkCount = model.getCount(CountType.LinkCount);

    const expected: number[] = [];
    for (let i = 1; i <= linkCount; i++) {
      expected.push(model.getLinkValue(i, LinkProperty.Length));
    }

    const bulk = model.getLinkValues(LinkProperty.Length);

    expect(bulk).toEqual(expected);
  });

  test("should not be available on versions earlier than 2.3", async () => {
    const oldWs = new SlimWorkspace();
    await oldWs.loadModuleVersion(EpanetV22);
    const model = new Project(oldWs);

    const f = () => model.getLinkValues(LinkProperty.Length);

    expect(f).toThrow("Method getLinkValues requires EPANET v2.3.0, loaded is v2.2.0.");
  });

  test("should fail when EPANET is not loaded", async () => {
    const emptyWs = new SlimWorkspace();
    const model = new Project(emptyWs);

    const f = () => model.getLinkValues(LinkProperty.Length);

    expect(f).toThrow("EPANET engine not loaded. Call loadModule() on the Workspace first.");
  });
});

describe("getNodeValues", () => {
  let model: Project;

  beforeEach(() => {
    model = new Project(ws);
    ws.writeFile("net1.inp", net1);
    model.open("net1.inp", "report.rpt", "out.bin");
  });

  afterEach(() => {
    model.close();
  });

  test("should return the same values as getNodeValue called per node", () => {
    const nodeCount = model.getCount(CountType.NodeCount);

    const expected: number[] = [];
    for (let i = 1; i <= nodeCount; i++) {
      expected.push(model.getNodeValue(i, NodeProperty.Demand));
    }

    const bulk = model.getNodeValues(NodeProperty.Demand);

    expect(bulk).toEqual(expected);
  });

  test("should not be available on versions earlier than 2.3", async () => {
    const oldWs = new SlimWorkspace();
    await oldWs.loadModuleVersion(EpanetV22);
    const model = new Project(oldWs);

    const f = () => model.getNodeValues(NodeProperty.Demand);

    expect(f).toThrow("Method getNodeValues requires EPANET v2.3.0, loaded is v2.2.0.");
  });

  test("should fail when EPANET is not loaded", async () => {
    const emptyWs = new SlimWorkspace();
    const model = new Project(emptyWs);

    const f = () => model.getNodeValues(NodeProperty.Demand);

    expect(f).toThrow("EPANET engine not loaded. Call loadModule() on the Workspace first.");
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
