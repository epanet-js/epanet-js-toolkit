import { Project, Workspace } from "../../src";
import { CountType, NodeType, ObjectType } from "../../src/enum";
import fs from "fs";

const net1 = fs.readFileSync(__dirname + "/../data/net1.inp", "utf8");
const netGenerated = fs.readFileSync(
  __dirname + "/../data/net1_backup.inp",
  "utf8",
);

// TODO: Sharing the workspace between tests is causing memory issues and flaky tests.

describe("Project Functions", async () => {
  let model: Project;
  let ws: Workspace;

  beforeEach(async () => {
    ws = new Workspace();
    await ws.loadModule();
    model = new Project(ws);
  });

  afterEach(() => {
    model.close();
  });

  describe("Project Initialization", () => {
    test("should initialize a new project", () => {
      model.init("report.rpt", "out.bin", 0, 0);
      const { line1, line2, line3 } = model.getTitle();
      expect(line1).toEqual("");
      expect(line2).toEqual("");
      expect(line3).toEqual("");
    });

    test("should throw error with bad properties during initialization", () => {
      function catchError() {
        model.init("repor{/st.rpt", "ou{/t.bin", 0, 0);
      }
      expect(catchError).toThrow("303");
    });
  });

  describe("Project Opening and Closing", () => {
    test("should open an existing project", () => {
      ws.writeFile("net1.inp", net1);
      model.open("net1.inp", "report.rpt", "out.bin");
      const nodeCount = model.getCount(CountType.NodeCount);
      expect(nodeCount).toEqual(11);
    });

    test("should throw error when accessing closed project", () => {
      ws.writeFile("net1.inp", net1);
      model.open("net1.inp", "report.rpt", "out.bin");
      model.close();

      function catchError() {
        model.getCount(CountType.NodeCount);
      }
      expect(catchError).toThrow("Error 102: no network data available");
    });
  });

  describe("Project Title Operations", () => {
    test("should set and get project title", () => {
      model.init("report.rpt", "out.bin", 0, 0);
      model.setTitle("Title 1", "Title Line 2", "");
      const { line1, line2, line3 } = model.getTitle();

      expect(line1).toEqual("Title 1");
      expect(line2).toEqual("Title Line 2");
      expect(line3).toEqual("");
    });
  });

  describe("Project Count Operations", () => {
    test("should get correct counts for an existing project", () => {
      ws.writeFile("net1.inp", net1);
      model.open("net1.inp", "report.rpt", "out.bin");
      const nodeCount = model.getCount(CountType.NodeCount);
      const linkCount = model.getCount(CountType.LinkCount);

      expect(nodeCount).toEqual(11);
      expect(linkCount).toEqual(13);
    });
  });

  describe("Project File Operations", () => {
    test.skip("should save project to INP file", () => {
      ws.writeFile("net1.inp", net1);
      model.init("report.rpt", "out.bin", 0, 0);

      //Create Network
      const node1Id = model.addNode("N1", NodeType.Junction);
      model.setJunctionData(node1Id, 700, 0, "");
      const node2Id = model.addNode("N2", NodeType.Junction);
      model.setJunctionData(node2Id, 600, 0, "");
      const linkId = model.addLink("L1", 0, "N1", "N2");
      model.setPipeData(linkId, 100, 50, 1, 1);

      model.saveInpFile("net1_backup.inp");
      const duplicateFile = ws.readFile("net1_backup.inp");

      expect(duplicateFile).toEqual(netGenerated);
    });

    test("should run an existing project and generate output files", () => {
      ws.writeFile("net1.inp", net1);
      model.runProject("net1.inp", "report.rpt", "out.bin");

      const rpt = ws.readFile("report.rpt");
      const bin = ws.readFile("out.bin", "binary");
      const epanetMagicNumber = new DataView(bin.buffer).getInt32(0, true);

      expect(rpt.length).toBeGreaterThan(0);
      expect(epanetMagicNumber).toEqual(516114521);
    });
  });

  describe("Project Comment Operations", () => {
    test("should set and get comments for objects", () => {
      ws.writeFile("net1.inp", net1);
      model.open("net1.inp", "report.rpt", "out.bin");

      model.setComment(ObjectType.Node, 1, "Comment 1");
      const comment = model.getComment(ObjectType.Node, 1);
      expect(comment).toEqual("Comment 1");
    });
  });
});
