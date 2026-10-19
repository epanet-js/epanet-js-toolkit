import { Project, Workspace } from "../../src";

import {
  StatusReport,
  AnalysisStatistic,
  ObjectType,
  NodeProperty,
  LinkProperty,
  NodeType,
  LinkType,
  ActionCodeType,
} from "../../src/enum";

import fs from "fs";

const net1 = fs.readFileSync(__dirname + "/../data/net1.inp", "utf8");

describe("Epanet Reporting Functions", () => {
  let ws: Workspace;
  let model: Project;

  beforeEach(async () => {
    ws = new Workspace();
    await ws.loadModule();
    model = new Project(ws);
  });

  describe("Report File Operations", () => {
    test("clear report", () => {
      ws.writeFile("net1.inp", net1);
      model.open("net1.inp", "net1.rpt", "out.bin");
      model.solveH();
      const rpt = ws.readFile("net1.rpt");
      expect(rpt.length).toBeGreaterThan(0);

      model.clearReport();

      const rpt2 = ws.readFile("net1.rpt");
      expect(rpt2).toEqual("");
    });

    test("write line", () => {
      ws.writeFile("net1.inp", net1);
      model.open("net1.inp", "net2.rpt", "out2.bin");
      model.solveH();

      model.writeLine("Test New Line");
      model.copyReport("test.rpt");

      const rpt2 = ws.readFile("test.rpt");
      expect(rpt2.slice(-13)).toEqual("Test New Line");
    });

    test("copy report", () => {
      ws.writeFile("net1.inp", net1);
      model.open("net1.inp", "net3.rpt", "out3.bin");
      model.solveH();

      model.copyReport("copied.rpt");
      const original = ws.readFile("net3.rpt");
      const copied = ws.readFile("copied.rpt");

      expect(copied).toEqual(original);
    });

    test("reset report", () => {
      ws.writeFile("net1.inp", net1);
      model.open("net1.inp", "net4.rpt", "out4.bin");

      // Set some custom report settings
      model.setStatusReport(StatusReport.FullReport);

      // Reset to defaults
      model.resetReport();

      // Verify by running simulation and checking report
      model.solveH();
      const rpt = ws.readFile("net4.rpt");

      // Report should be empty
      expect(rpt).toBe("");
    });

    test("set report format", () => {
      ws.writeFile("net1.inp", net1);
      model.open("net1.inp", "net5.rpt", "out5.bin");

      model.solveH();
      model.saveH();

      model.resetReport();
      model.setReport("FILE myfile.rpt");
      model.setReport("NODES NONE");
      model.setReport("LINKS ALL");
      model.setReport("VELOCITY ABOVE 1.0");

      model.report();

      const rpt = ws.readFile("myfile.rpt");
      expect(rpt).toContain("with Velocity above 1.00 fps");
      expect(rpt).toContain("Link Results at");
      expect(rpt).not.toContain("Node Results at");
    });

    test("set status report level", () => {
      ws.writeFile("net1.inp", net1);
      model.open("net1.inp", "net6.rpt", "out6.bin");

      // Set full status reporting
      model.setStatusReport(StatusReport.FullReport);
      model.solveH();
      const rpt = ws.readFile("net6.rpt");
      expect(rpt).toContain("Trial  1:");
      expect(rpt).toContain("maximum  flow change =");
    });

    test("get statistics", () => {
      ws.writeFile("net1.inp", net1);
      model.open("net1.inp", "net7.rpt", "out7.bin");
      model.solveH();

      // Get various statistics
      const iterations = model.getStatistic(AnalysisStatistic.Iterations);
      const relativeError = model.getStatistic(AnalysisStatistic.RelativeError);
      const maxHeadError = model.getStatistic(AnalysisStatistic.MaxHeadError);

      expect(iterations).toBeGreaterThan(0);
      expect(relativeError).toBeGreaterThanOrEqual(0);
      expect(maxHeadError).toBeGreaterThanOrEqual(0);
    });

    test("get result index maintains correct mapping after network modifications", () => {
      ws.writeFile("net1.inp", net1);
      model.open("net1.inp", "net8.rpt", "out8.bin");
      model.solveH();

      // Get initial result indices for some nodes and links
      const node1Index = model.getResultIndex(ObjectType.Node, 1);
      const node2Index = model.getResultIndex(ObjectType.Node, 2);
      const link1Index = model.getResultIndex(ObjectType.Link, 1);
      const link2Index = model.getResultIndex(ObjectType.Link, 2);

      // Store some initial results for later comparison
      const node1InitialHead = model.getNodeValue(1, NodeProperty.Head);
      const node2InitialHead = model.getNodeValue(2, NodeProperty.Head);
      const link1InitialFlow = model.getLinkValue(1, LinkProperty.Flow);
      const link2InitialFlow = model.getLinkValue(2, LinkProperty.Flow);

      // Modify the network by adding and deleting elements
      // This will change the indices of existing elements
      const newNodeIndex = model.addNode("NEW_NODE", NodeType.Junction);
      model.setJunctionData(newNodeIndex, 700, 0, "");

      // Add a new link connected to the new node
      const newLinkIndex = model.addLink(
        "NEW_LINK",
        LinkType.Pipe,
        "NEW_NODE",
        "2",
      );
      model.setPipeData(newLinkIndex, 100, 50, 1, 1);

      // Delete an existing node and link
      model.deleteNode(3, ActionCodeType.Unconditional);
      model.deleteLink(3, ActionCodeType.Unconditional);

      // Get new result indices for the same nodes and links
      const node1NewIndex = model.getResultIndex(ObjectType.Node, 1);
      const node2NewIndex = model.getResultIndex(ObjectType.Node, 2);
      const link1NewIndex = model.getResultIndex(ObjectType.Link, 1);
      const link2NewIndex = model.getResultIndex(ObjectType.Link, 2);

      // Verify that result indices remain the same despite network modifications
      expect(node1NewIndex).toEqual(node1Index);
      expect(node2NewIndex).toEqual(node2Index);
      expect(link1NewIndex).toEqual(link1Index);
      // Note: link2's result index will be different because we added a new link
      // before deleting link3, which affects the result index mapping
      expect(link2NewIndex).not.toEqual(link2Index);

      // Verify that we can still retrieve the correct results using the original indices
      const node1Head = model.getNodeValue(1, NodeProperty.Head);
      const node2Head = model.getNodeValue(2, NodeProperty.Head);
      const link1Flow = model.getLinkValue(1, LinkProperty.Flow);
      const link2Flow = model.getLinkValue(2, LinkProperty.Flow);

      expect(node1Head).toEqual(node1InitialHead);
      expect(node2Head).toEqual(node2InitialHead);
      expect(link1Flow).toEqual(link1InitialFlow);
      expect(link2Flow).toEqual(link2InitialFlow);
    });
  });
});

describe("Report Callback", () => {
  let ws: Workspace;
  let model: Project;

  beforeEach(async () => {
    ws = new Workspace();
    await ws.loadModule();
    model = new Project(ws);
    ws.writeFile("net1.inp", net1);
  });

  afterEach(() => {
    model.close();
  });

  test("workspace reports callback support", () => {
    expect(ws.supportsCallbacks).toBe(true);
  });

  test("receives lines written with writeLine instead of the report file", () => {
    model.open("net1.inp", "cb.rpt", "cb.bin");
    const lines: string[] = [];
    model.setReportCallback((line) => lines.push(line));

    model.writeLine("hello from javascript");
    model.writeLine("second line");

    expect(lines).toEqual(["hello from javascript", "second line"]);
    expect(model.getReportCallback()).not.toBeNull();

    model.close();
    expect(ws.readFile("cb.rpt")).not.toContain("hello from javascript");
  });

  test("receives the full report produced by report()", () => {
    model.open("net1.inp", "", "");
    const lines: string[] = [];
    model.setReportCallback((line) => lines.push(line));

    model.setReport("NODES ALL");
    model.solveH();
    model.solveQ();
    model.report();

    expect(lines.length).toBeGreaterThan(10);
    expect(lines.some((l) => /Analysis begun/.test(l))).toBe(true);
    expect(lines.some((l) => /Node Results/.test(l))).toBe(true);
  });

  test("stays attached when set before open() and across close()/open()", () => {
    const lines: string[] = [];
    model.setReportCallback((line) => lines.push(line));

    model.open("net1.inp", "cb2.rpt", "cb2.bin");
    model.writeLine("after open");
    model.close();
    model.open("net1.inp", "cb2.rpt", "cb2.bin");
    model.writeLine("after reopen");

    expect(lines).toEqual(["after open", "after reopen"]);
  });

  test("stays attached across init()", () => {
    const lines: string[] = [];
    model.setReportCallback((line) => lines.push(line));
    model.init("cb3.rpt", "cb3.bin", 0, 0);
    model.writeLine("after init");

    expect(lines.some((l) => /E P A N E T/.test(l))).toBe(true);
    expect(lines[lines.length - 1]).toEqual("after init");
  });

  test("a second call replaces the previous callback", () => {
    model.open("net1.inp", "cb4.rpt", "cb4.bin");
    const first: string[] = [];
    const second: string[] = [];
    model.setReportCallback((line) => first.push(line));
    model.setReportCallback((line) => second.push(line));

    model.writeLine("only the second sees this");

    expect(first).toEqual([]);
    expect(second).toEqual(["only the second sees this"]);
  });

  test("null clears the callback and restores report-file output", () => {
    model.open("net1.inp", "cb5.rpt", "cb5.bin");
    const lines: string[] = [];
    model.setReportCallback((line) => lines.push(line));
    model.writeLine("to callback");

    model.setReportCallback(null);
    model.writeLine("to file");
    expect(model.getReportCallback()).toBeNull();

    model.close();
    expect(lines).toEqual(["to callback"]);
    expect(ws.readFile("cb5.rpt")).toContain("to file");
  });

  test("projects sharing a workspace do not receive each other's lines", () => {
    const other = new Project(ws);
    model.open("net1.inp", "a.rpt", "a.bin");
    other.open("net1.inp", "b.rpt", "b.bin");
    const a: string[] = [];
    const b: string[] = [];
    model.setReportCallback((line) => a.push(line));
    other.setReportCallback((line) => b.push(line));

    model.writeLine("to A");
    other.writeLine("to B");
    model.writeLine("to A again");

    expect(a).toEqual(["to A", "to A again"]);
    expect(b).toEqual(["to B"]);
    other.close();
  });

  test("an exception thrown by the callback propagates to the caller", () => {
    model.open("net1.inp", "", "");
    model.setReportCallback(() => {
      throw new Error("boom from callback");
    });
    expect(() => model.writeLine("x")).toThrow("boom from callback");
    model.setReportCallback(null);
  });
});
