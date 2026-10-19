import { Project, Workspace, readBinary } from "../src";
import {
  FlowUnits,
  LinkType,
  NodeType,
  PressureUnits,
  QualityType,
  StatisticType,
} from "../src/enum";

import { readFileSync } from "fs";
import { join } from "path";

const net1 = readFileSync(join(__dirname, "./data/net1.inp"), "utf8");

const ws = new Workspace();
await ws.loadModule();

const epanetMagicNumber = 516114521;

describe("OutputReader", () => {
  let model: Project;

  beforeEach(() => {
    model = new Project(ws);
  });

  afterEach(() => {
    model.close();
  });

  describe("readBinary", () => {
    const runNet1 = () => {
      ws.writeFile("net1.inp", net1);
      model.open("net1.inp", "net1.rpt", "out.bin");
      model.solveH();
      model.solveQ();
      model.report();
      return ws.readFile("out.bin", "binary");
    };

    test("reads the prolog", () => {
      const results = readBinary(runNet1());

      expect(results.prolog).toEqual({
        version: 20012,
        nodeCount: 11,
        resAndTankCount: 2,
        linkCount: 13,
        pumpCount: 1,
        valveCount: 0,
        qualityType: QualityType.Chem,
        tracedNodeIndex: 0,
        flowUnits: FlowUnits.GPM,
        pressureUnits: PressureUnits.PSI,
        statisticType: StatisticType.Series,
        reportingStartTime: 0,
        reportingTimeStep: 3600,
        simulationDuration: 86400,
        title: [
          " EPANET Example Network 1",
          "A simple example of modeling chlorine decay. Both bulk and",
          "wall reactions are included. ",
        ],
        inputFileName: "net1.inp",
        reportFileName: "",
        chemicalName: "Chlorine",
        chemicalUnits: "mg/L",
        reportingPeriods: 25,
      });
    });

    test("reads node and link results", () => {
      const results = readBinary(runNet1());
      const { nodes, links } = results.results;

      expect(nodes).toHaveLength(11);
      expect(links).toHaveLength(13);

      const tank = nodes.find((n) => n.id === "2");
      expect(tank?.type).toEqual(NodeType.Tank);
      expect(nodes.find((n) => n.id === "9")?.type).toEqual(NodeType.Reservoir);
      expect(nodes.find((n) => n.id === "10")?.type).toEqual(NodeType.Junction);
      expect(tank?.head).toHaveLength(25);

      const pump = links.find((l) => l.id === "9");
      expect(pump?.type).toEqual(LinkType.Pump);
      expect(links.find((l) => l.id === "10")?.type).toEqual(LinkType.Pipe);
      expect(pump?.flow).toHaveLength(25);
    });

    test("reads the epilog", () => {
      const results = readBinary(runNet1());
      const { epilog } = results;

      expect(epilog.reportingPeriods).toEqual(25);
      expect(epilog.reportingPeriods).toEqual(results.prolog.reportingPeriods);
      expect(epilog.warningFlag).toBe(false);
      expect(epilog.magicNumber).toEqual(epanetMagicNumber);

      // Net1 runs a chlorine analysis with first-order bulk and wall decay
      // but defines no [SOURCES], so source inflow is zero.
      expect(epilog.averageBulkReactionRate).toBeCloseTo(18952.94, 1);
      expect(epilog.averageWallReactionRate).toBeCloseTo(87119.23, 1);
      expect(epilog.averageTankReactionRate).toBeCloseTo(114051.03, 1);
      expect(epilog.averageSourceInflowRate).toEqual(0);
    });
  });
});
