import { Project, Workspace } from "../../src";
import {
  CountType,
  NodeType,
  ActionCodeType,
  FlowUnits,
  HeadLossType,
  NodeProperty,
} from "../../src/enum";

import { readFileSync } from "fs";
import { join } from "path";

const net1 = readFileSync(join(__dirname, "../data/net1.inp"), "utf8");
const tankTestInp = readFileSync(
  join(__dirname, "../data/tankTest.inp"),
  "utf8",
);

const mixedUnitsInp = readFileSync(
  join(__dirname, "../data/mixed-units.inp"),
  "utf8",
);

const ws = new Workspace();
await ws.loadModule();

describe("Network Node Functions", () => {
  let model: Project;

  beforeEach(() => {
    model = new Project(ws);
  });

  afterEach(() => {
    model.close();
  });

  describe("Error Handling", () => {
    test("should throw if invalid node ID", () => {
      model.init("report.rpt", "out.bin", 0, 0);
      expect(() => {
        model.getNodeIndex("N1");
      }).toThrow("203: function call contains undefined node");
    });

    test("should throw if unable to delete node with link attached", () => {
      ws.writeFile("net1.inp", net1);
      model.open("net1.inp", "report.rpt", "out.bin");

      expect(model.getCount(CountType.NodeCount)).toBeGreaterThan(0);
      expect(() => {
        model.deleteNode(1, ActionCodeType.Conditional);
      }).toThrow(/Error 259/);
    });

    test("should throw if unable to delete node in control", () => {
      ws.writeFile("net1.inp", net1);
      model.open("net1.inp", "report.rpt", "out.bin");

      const tankIndex = model.getNodeIndex("2");
      const linkIndex = model.getLinkIndex("110");

      model.deleteLink(linkIndex, ActionCodeType.Unconditional);

      expect(() => {
        model.deleteNode(tankIndex, ActionCodeType.Conditional);
      }).toThrow(/Error 261/);
    });
  });

  describe("Basic Node Operations", () => {
    test("should add and delete node", () => {
      model.init("report.rpt", "out.bin", 0, 0);

      // Create node
      const node1Id = model.addNode("N1", NodeType.Junction);
      model.setJunctionData(node1Id, 700, 0, "");

      // Verify node count
      const count1 = model.getCount(CountType.NodeCount);
      expect(count1).toEqual(1);

      // Verify node index and ID
      const nodeIndex = model.getNodeIndex("N1");
      expect(nodeIndex).toEqual(node1Id);
      const nodeName = model.getNodeId(nodeIndex);
      expect(nodeName).toEqual("N1");

      // Delete node and verify
      model.deleteNode(node1Id, ActionCodeType.Unconditional);
      const count2 = model.getCount(CountType.NodeCount);
      expect(count2).toEqual(0);
    });

    test("should set and get node coordinates", () => {
      model.init("report.rpt", "out.bin", 0, 0);

      // Create node
      model.addNode("N1", NodeType.Junction);
      const node1Id = model.getNodeIndex("N1");
      model.setJunctionData(node1Id, 700, 0, "");

      // Set and verify coordinates
      model.setCoordinates(node1Id, 100, 300);
      const { x, y } = model.getCoordinates(node1Id);
      expect(x).toEqual(100);
      expect(y).toEqual(300);
    });

    test("should set and get node types", () => {
      model.init("report.rpt", "out.bin", 0, 0);

      // Create node and verify type
      const node1Id = model.addNode("N1", NodeType.Reservoir);
      const nodeType = model.getNodeType(node1Id);
      expect(nodeType).toEqual(NodeType.Reservoir);
    });

    test("should set node ID and get index", () => {
      model.init("report.rpt", "out.bin", 0, 0);

      // Create node and change ID
      const node1Id = model.addNode("N1", NodeType.Tank);
      model.setNodeId(node1Id, "Tank1");

      // Verify new ID
      const indexLookup = model.getNodeIndex("Tank1");
      expect(node1Id).toEqual(indexLookup);
    });
  });

  describe("Node Properties", () => {
    test("should set and get node values", () => {
      model.init("report.rpt", "out.bin", FlowUnits.LPS, HeadLossType.DW);

      // Create node and set values
      const node1Id = model.addNode("N1", NodeType.Junction);
      model.setNodeValue(node1Id, NodeProperty.Elevation, 10);
      const result = model.getNodeValue(node1Id, NodeProperty.Elevation);
      expect(result).toEqual(10);
    });

    test("should set and get tank values in metric units", () => {
      model.init("report.rpt", "out.bin", FlowUnits.LPS, HeadLossType.HW);

      // Create tank and set data
      const tankId = model.addNode("N1", NodeType.Tank);
      model.setTankData(tankId, 200, 1, 0, 4, 3.2, 1, "");

      // Verify tank properties
      const elevation = model.getNodeValue(tankId, NodeProperty.Elevation);
      const minLevel = model.getNodeValue(tankId, NodeProperty.MinLevel);
      const maxLevel = model.getNodeValue(tankId, NodeProperty.MaxLevel);
      const tankDiam = model.getNodeValue(tankId, NodeProperty.TankDiam);
      const minVolume = model.getNodeValue(tankId, NodeProperty.MinVolume);

      expect(elevation).toEqual(200);
      expect(minLevel).toEqual(0);

      // TODO: Fix this, why does this come back as almost the value, it doesnt seem like just floating point precision
      expect(maxLevel).toBeCloseTo(4);
      expect(tankDiam).toEqual(3.2);
      expect(minVolume).toEqual(1);
    });

    test("should set and get tank values in US units", () => {
      model.init("report.rpt", "out.bin", FlowUnits.GPM, HeadLossType.HW);

      // Create tank and set data
      const tankId = model.addNode("N1", NodeType.Tank);
      model.setTankData(tankId, 10, 1, 0, 5, 3.2, 1, "");

      // Verify tank properties
      const elevation = model.getNodeValue(tankId, NodeProperty.Elevation);
      const minLevel = model.getNodeValue(tankId, NodeProperty.MinLevel);
      const maxLevel = model.getNodeValue(tankId, NodeProperty.MaxLevel);
      const tankDiam = model.getNodeValue(tankId, NodeProperty.TankDiam);
      const minVolume = model.getNodeValue(tankId, NodeProperty.MinVolume);

      expect(elevation).toEqual(10);
      expect(minLevel).toEqual(0);
      expect(maxLevel).toEqual(5);
      expect(tankDiam).toEqual(3.2);
      expect(minVolume).toEqual(1);
    });

    test("should set and get junction values in mixed units", () => {
      ws.writeFile("net1.inp", mixedUnitsInp);
      model.open("net1.inp", "report.rpt", "out.bin");

      model.solveH();

      const junctionIndex = model.getNodeIndex("J1");
      const pressure = model.getNodeValue(junctionIndex, NodeProperty.Pressure);
      expect(pressure).toBeCloseTo(63.12, 2); // 63.12 psi

      const demand = model.getNodeValue(junctionIndex, NodeProperty.BaseDemand);
      expect(demand).toBeCloseTo(0.19, 2); // 0.19 lps
    });

    test("should set and get junction data", () => {
      ws.writeFile("net1.inp", net1);
      model.open("net1.inp", "report.rpt", "out.bin");

      // Create junction and set data
      const junctionId = model.addNode("J1", NodeType.Junction);
      model.setJunctionData(junctionId, 700, 150, "1");

      // Verify junction properties
      const elevation = model.getNodeValue(junctionId, NodeProperty.Elevation);
      const demand = model.getNodeValue(junctionId, NodeProperty.BaseDemand);
      const pattern = model.getNodeValue(junctionId, NodeProperty.Pattern);

      const patternIndex = model.getPatternIndex("1");

      expect(elevation).toEqual(700);
      expect(demand).toEqual(150);
      expect(pattern).toEqual(patternIndex);
    });
  });

  describe("Real-world Data Tests", () => {
    test("should handle node types from net1.inp", () => {
      ws.writeFile("net1.inp", net1);
      model.open("net1.inp", "report.rpt", "out.bin");

      // Test junction
      const junctionIndex = model.getNodeIndex("10");
      const junctionType = model.getNodeType(junctionIndex);
      expect(junctionType).toEqual(NodeType.Junction);

      // Test reservoir
      const reservoirIndex = model.getNodeIndex("9");
      const reservoirType = model.getNodeType(reservoirIndex);
      expect(reservoirType).toEqual(NodeType.Reservoir);

      // Test tank
      const tankIndex = model.getNodeIndex("2");
      const tankType = model.getNodeType(tankIndex);
      expect(tankType).toEqual(NodeType.Tank);
    });

    test("should handle node types from tankTestInp.inp", () => {
      ws.writeFile("tankTestInp.inp", tankTestInp);
      model.open("tankTestInp.inp", "tankTestInp.rpt", "tankTestInp.bin");

      // Test junction
      const junctionIndex = model.getNodeIndex("J1");
      const junctionType = model.getNodeType(junctionIndex);
      expect(junctionType).toEqual(NodeType.Junction);

      // Test reservoir
      const reservoirIndex = model.getNodeIndex("R1");
      const reservoirType = model.getNodeType(reservoirIndex);
      expect(reservoirType).toEqual(NodeType.Reservoir);

      // Test tank with flat curve (should be treated as reservoir)
      const tank1Index = model.getNodeIndex("T1");
      const tank1Type = model.getNodeType(tank1Index);
      expect(tank1Type).toEqual(NodeType.Reservoir);

      // Test regular tank
      const tank2Index = model.getNodeIndex("T2");
      const tank2Type = model.getNodeType(tank2Index);
      expect(tank2Type).toEqual(NodeType.Tank);
    });

    test("should handle node properties from net1.inp", () => {
      ws.writeFile("net1.inp", net1);
      model.open("net1.inp", "report.rpt", "out.bin");

      // Test junction properties
      const junctionIndex = model.getNodeIndex("10");
      const junctionElevation = model.getNodeValue(
        junctionIndex,
        NodeProperty.Elevation,
      );
      const junctionDemand = model.getNodeValue(
        junctionIndex,
        NodeProperty.BaseDemand,
      );
      expect(junctionElevation).toEqual(710);
      expect(junctionDemand).toEqual(0);

      // Test reservoir properties
      const reservoirIndex = model.getNodeIndex("9");
      const reservoirHead = model.getNodeValue(
        reservoirIndex,
        NodeProperty.Elevation,
      );
      expect(reservoirHead).toEqual(800);

      // Test tank properties
      const tankIndex = model.getNodeIndex("2");
      const tankElevation = model.getNodeValue(
        tankIndex,
        NodeProperty.Elevation,
      );
      const tankLevel = model.getNodeValue(tankIndex, NodeProperty.TankLevel);
      const tankMinLevel = model.getNodeValue(tankIndex, NodeProperty.MinLevel);
      const tankMaxLevel = model.getNodeValue(tankIndex, NodeProperty.MaxLevel);
      const tankDiam = model.getNodeValue(tankIndex, NodeProperty.TankDiam);
      expect(tankElevation).toEqual(850);
      expect(tankLevel).toBeDefined();
      expect(tankMinLevel).toEqual(100);
      expect(tankMaxLevel).toEqual(150);
      expect(tankDiam).toEqual(50.5);
    });
  });

  describe("Tank Volume Calculations", () => {
    test("should report min volume", () => {
      model.init("report.rpt", "out.bin", FlowUnits.GPM, HeadLossType.HW);

      const tankId = model.addNode("T2", NodeType.Tank);
      const tankElevation = 850;
      const tankInitLevel = 970;
      const tankMinLevel = 950;
      const tankMaxLevel = 1000;
      const tankDiam = 50.5;
      const tankMinVolume = 1000;
      model.setTankData(
        tankId,
        tankElevation,
        tankInitLevel,
        tankMinLevel,
        tankMaxLevel,
        tankDiam,
        tankMinVolume,
        "",
      );

      const minVolume = model.getNodeValue(tankId, NodeProperty.MinVolume);
      expect(minVolume).toEqual(tankMinVolume);
    });
  });
});
