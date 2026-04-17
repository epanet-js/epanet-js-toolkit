import { beforeAll } from "vitest";
import { Project } from "../../src";
import { Workspace } from "../../src";

import { readFileSync } from "fs";
import { join } from "path";
import { MsxConstant, MsxChemicalSpeciesType, MsxChemicalSpeciesSourceType } from "../../src/enum";

const networkInp = readFileSync(join(__dirname, "../data/network_msx.inp"));
const networkMsx = readFileSync(join(__dirname, "../data/network_msx.msx"));
const ws = new Workspace();

beforeAll(async () => {
  await ws.loadModule();
});

describe("MSX Functions", () => {
  let model: Project;

  beforeEach(() => {
    ws.writeFile("net.inp", networkInp);
    ws.writeFile("net.msx", networkMsx);

    model = new Project(ws);
    model.open("net.inp", "net.rpt", "net.out");
    model.msxOpen("net.msx");
    model.msxSolveH();
    model.msxSolveQ();
  });

  afterEach(() => {
    model.msxClose();
    model.close();
  });

  describe("Object Counts", () => {
    test("msxGetCount returns 5 species", () => {
      const count = model.msxGetCount(MsxConstant.Species);
      expect(count).toBe(5); // AS3, AS5, AStot, AS5s, NH2CL
    });

    test("msxGetCount returns 5 constants", () => {
      const count = model.msxGetCount(MsxConstant.Constant);
      expect(count).toBe(5); // Ka, Kb, K1, K2, Smax
    });
  });

  describe("Object Lookup", () => {
    test("msxGetIndex returns index 1 for species AS3", () => {
      const index = model.msxGetIndex(MsxConstant.Species, "AS3");
      expect(index).toBe(1);
    });

    test("msxGetId returns AS3 for species index 1", () => {
      const id = model.msxGetId(MsxConstant.Species, 1);
      expect(id).toBe("AS3");
    });

    test("msxGetIdLen returns positive length for species 1", () => {
      const len = model.msxGetIdLen(MsxConstant.Species, 1);
      expect(len).toBeGreaterThan(0);
    });
  });

  describe("Species Properties", () => {
    test("msxGetSpecies returns BULK type and UG units for AS3 (index 1)", () => {
      const species = model.msxGetSpecies(1);
      expect(species.type).toBe(MsxChemicalSpeciesType.Bulk);
      expect(species.units).toBe("UG");
    });
  });

  describe("Constants", () => {
    test("msxGetConstant returns Ka=10.0 for constant index 1", () => {
      const index = model.msxGetIndex(MsxConstant.Constant, "Ka");
      const value = model.msxGetConstant(index);
      expect(value).toBeCloseTo(10.0);
    });

    test("msxSetConstant changes the value and msxGetConstant reads it back", () => {
      const index = model.msxGetIndex(MsxConstant.Constant, "Ka");
      model.msxSetConstant(index, 15.0);
      const value = model.msxGetConstant(index);
      expect(value).toBeCloseTo(15.0);
    });
  });

  describe("Initial Quality", () => {
    test("msxGetInitQual returns 10.0 for AS3 at Source node", () => {
      const sourceIndex = model.getNodeIndex("Source");
      const speciesIndex = model.msxGetIndex(MsxConstant.Species, "AS3");
      const value = model.msxGetInitQual(MsxConstant.Node, sourceIndex, speciesIndex);
      expect(value).toBeCloseTo(10.0);
    });

    test("msxSetInitQual sets a new value and msxGetInitQual reads it back", () => {
      const sourceIndex = model.getNodeIndex("Source");
      const speciesIndex = model.msxGetIndex(MsxConstant.Species, "AS3");
      model.msxSetInitQual(MsxConstant.Node, sourceIndex, 1, 12.0);
      const value = model.msxGetInitQual(MsxConstant.Node, sourceIndex, speciesIndex);
      expect(value).toBeCloseTo(12.0);
    });
  });

  describe("Water Quality Results", () => {
    test("msxGetQual returns a numeric value for AS3 at Source node", () => {
      const sourceIndex = model.getNodeIndex("Source");
      const speciesIndex = model.msxGetIndex(MsxConstant.Species, "AS3");
      const value = model.msxGetQual(MsxConstant.Node, sourceIndex, speciesIndex);
      expect(typeof value).toBe("number");
    });
  });

  describe("Sources", () => {
    test("msxGetSource reads source info at Source node for AS3", () => {
      const sourceIndex = model.getNodeIndex("Source");
      const speciesIndex = model.msxGetIndex(MsxConstant.Species, "AS3");
      
      const source = model.msxGetSource(sourceIndex, speciesIndex);
      
      expect(source).toEqual({
        type: MsxChemicalSpeciesSourceType.NoSource,
        level: 0,
        pat: 0
      });
    });

    test("msxSetSource sets a CONCEN source and resets to NOSOURCE", () => {
      const sourceIndex = model.getNodeIndex("Source");
      
      expect(() => model.msxSetSource(sourceIndex, 1, MsxChemicalSpeciesSourceType.Concentration, 5.0, 0)).not.toThrow();
      expect(() => model.msxSetSource(sourceIndex, 1, MsxChemicalSpeciesSourceType.NoSource, 0.0, 0)).not.toThrow();
    });
  });

  describe("Patterns", () => {
    test("msxAddPattern creates a new MSX pattern", () => {
      model.msxAddPattern("TestPat");
      const count = model.msxGetCount(MsxConstant.Pattern);
      expect(count).toBeGreaterThan(0);
    });

    test("msxSetPattern / msxGetPatternLen / msxGetPatternValue / msxSetPatternValue round-trip", () => {
      model.msxAddPattern("TestPat");
      const patIndex = model.msxGetIndex(MsxConstant.Pattern, "TestPat");

      model.msxSetPattern(patIndex, [1.0, 1.5, 0.8]);

      const len = model.msxGetPatternLen(patIndex);
      expect(len).toBe(3);

      const v1 = model.msxGetPatternValue(patIndex, 1);
      expect(v1).toBeCloseTo(1.0);

      model.msxSetPatternValue(patIndex, 1, 2.0);
      const v2 = model.msxGetPatternValue(patIndex, 1);
      expect(v2).toBeCloseTo(2.0);
    });
  });

  describe("Simulation", () => {
    test("msxSaveMsxFile saves a non-empty MSX input file", () => {
      model.msxSaveMsxFile("saved.msx");
      const saved = ws.readFile("saved.msx", "binary");
      expect(saved.length).toBeGreaterThan(0);
    });

    test("msxInit and msxStep run a step-by-step MSX simulation", () => {
      model.msxSolveH();
      model.msxInit(0);
  
      const { t, tleft } = model.msxStep();
      expect(typeof t).toBe("number");
      expect(tleft).toBeGreaterThanOrEqual(0);
    });

    test("msxSaveOutFile saves a non-empty binary output file", () => {
      model.msxSolveH();
      model.msxInit(1);

      let tleft = 1;
      let iters = 0;
      while (tleft > 0 && iters < 1000) {
        const result = model.msxStep();
        tleft = result.tleft;
        iters++;
      }

      model.msxSaveOutFile("msxout.bin");
      const outFile = ws.readFile("msxout.bin", "binary");
      expect(outFile.length).toBeGreaterThan(0);
    });
  });

  describe("Error Handling", () => {
    test("msxGetId throws when MSX is not loaded", () => {
      const notLoadedProject = new Project(new Workspace());
      expect(() => notLoadedProject.msxGetId(MsxConstant.Species, 1)).toThrow(
        "EPANET engine not loaded",
      );
    });
  });
});
