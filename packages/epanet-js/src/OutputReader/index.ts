import {
  FlowUnits,
  LinkType,
  NodeType,
  PressureUnits,
  QualityType,
  StatisticType,
} from '../enum';

enum NodeResultTypes {
  Demand,
  Head,
  Pressure,
  WaterQuality,
}

enum LinkResultTypes {
  Flow,
  Velocity,
  Headloss,
  AvgWaterQuality,
  Status,
  Setting,
  ReactionRate,
  Friction,
}

const idBytes = 32;

export interface LinkResults {
  id: string;
  type: LinkType;
  flow: number[];
  velocity: number[];
  headloss: number[];
  avgWaterQuality: number[];
  status: number[];
  setting: number[];
  reactionRate: number[];
  friction: number[];
}

export interface NodeResults {
  id: string;
  type: NodeType;
  demand: number[];
  head: number[];
  pressure: number[];
  waterQuality: number[];
}

export interface EpanetProlog {
  version: number;
  nodeCount: number;
  resAndTankCount: number;
  linkCount: number;
  pumpCount: number;
  valveCount: number;
  qualityType: QualityType;
  tracedNodeIndex: number;
  flowUnits: FlowUnits;
  pressureUnits: PressureUnits;
  statisticType: StatisticType;
  reportingStartTime: number;
  reportingTimeStep: number;
  simulationDuration: number;
  title: [string, string, string];
  inputFileName: string;
  reportFileName: string;
  chemicalName: string;
  chemicalUnits: string;
  reportingPeriods: number;
}

export interface EpanetEpilog {
  averageBulkReactionRate: number;
  averageWallReactionRate: number;
  averageTankReactionRate: number;
  averageSourceInflowRate: number;
  reportingPeriods: number;
  warningFlag: boolean;
}

export interface EpanetResults {
  prolog: EpanetProlog;
  epilog: EpanetEpilog;
  results: {
    nodes: NodeResults[];
    links: LinkResults[];
  };
}

const epilogBytes = 28;

export function readBinary(results: Uint8Array): EpanetResults {
  const view1 = new DataView(results.buffer);
  const epilog = getEpilog(results.byteLength - epilogBytes, view1);
  const prolog = getProlog(view1, epilog.reportingPeriods);

  const offsetNodeIds = 884;
  const offsetLinkIds = offsetNodeIds + idBytes * prolog.nodeCount;
  const offsetLinkTypes =
    offsetNodeIds + 32 * prolog.nodeCount + 40 * prolog.linkCount;
  const offsetNodeIndexes =
    offsetNodeIds + 32 * prolog.nodeCount + 44 * prolog.linkCount;
  const offsetResults =
    offsetNodeIds +
    36 * prolog.nodeCount +
    52 * prolog.linkCount +
    8 * prolog.resAndTankCount +
    28 * prolog.pumpCount +
    4;

  const nodeIds = getIds(offsetNodeIds, prolog.nodeCount, view1);
  const nodeTypes = getNodeTypes(
    offsetNodeIndexes,
    prolog.nodeCount,
    prolog.resAndTankCount,
    view1
  );
  const linkIds = getIds(offsetLinkIds, prolog.linkCount, view1);
  const linkTypes = getLinkTypes(offsetLinkTypes, prolog.linkCount, view1);

  const nodes: NodeResults[] = [...Array(prolog.nodeCount)].map((_, i) => {
    return getNodeResults(
      prolog,
      offsetResults,
      i,
      view1,
      nodeIds[i],
      nodeTypes[i]
    );
  });
  const links: LinkResults[] = [...Array(prolog.linkCount)].map((_, i) => {
    return getLinkResults(
      prolog,
      offsetResults,
      i,
      view1,
      linkIds[i],
      linkTypes[i]
    );
  });

  const data: EpanetResults = {
    prolog,
    epilog,
    results: {
      nodes,
      links,
    },
  };
  return data;
}

const getProlog = (
  dataView: DataView,
  reportingPeriods: number
): EpanetProlog => {
  const text = (offset: number, length: number) =>
    stringFrom(dataView.buffer.slice(offset, offset + length));
  return {
    version: dataView.getInt32(4, true),
    nodeCount: dataView.getInt32(8, true),
    resAndTankCount: dataView.getInt32(12, true),
    linkCount: dataView.getInt32(16, true),
    pumpCount: dataView.getInt32(20, true),
    valveCount: dataView.getInt32(24, true),
    qualityType: dataView.getInt32(28, true),
    tracedNodeIndex: dataView.getInt32(32, true),
    flowUnits: dataView.getInt32(36, true),
    pressureUnits: dataView.getInt32(40, true),
    statisticType: dataView.getInt32(44, true),
    reportingStartTime: dataView.getInt32(48, true),
    reportingTimeStep: dataView.getInt32(52, true),
    simulationDuration: dataView.getInt32(56, true),
    title: [text(60, 80), text(140, 80), text(220, 80)],
    inputFileName: text(300, 260),
    reportFileName: text(560, 260),
    chemicalName: text(820, 32),
    chemicalUnits: text(852, 32),
    reportingPeriods,
  };
};

const getEpilog = (offset: number, dataView: DataView): EpanetEpilog => {
  return {
    averageBulkReactionRate: dataView.getFloat32(offset, true),
    averageWallReactionRate: dataView.getFloat32(offset + 4, true),
    averageTankReactionRate: dataView.getFloat32(offset + 8, true),
    averageSourceInflowRate: dataView.getFloat32(offset + 12, true),
    reportingPeriods: dataView.getInt32(offset + 16, true),
    warningFlag: dataView.getInt32(offset + 20, true) !== 0,
  };
};

const getIds = (
  offset: number,
  count: number,
  dataView: DataView
): string[] => {
  const ids: string[] = [];

  forEachIndex(count, index => {
    const arrayBuffer = dataView.buffer.slice(
      offset + idBytes * index,
      offset + idBytes * index + idBytes
    );
    ids.push(stringFrom(arrayBuffer));
  });

  return ids;
};

const getNodeTypes = (
  offset: number,
  nodeCount: number,
  resAndTankCount: number,
  dataView: DataView
): NodeType[] => {
  const types: NodeType[] = [];
  const [resAndTankIndexes, resAndTankAreas] = getResAndTanksData(
    offset,
    resAndTankCount,
    dataView
  );

  forEachIndex(nodeCount, index => {
    if (!resAndTankIndexes.includes(index)) {
      types.push(NodeType.Junction);
      return;
    }

    if (resAndTankAreas[resAndTankIndexes.indexOf(index)] === 0.0) {
      types.push(NodeType.Reservoir);
      return;
    }

    types.push(NodeType.Tank);
  });

  return types;
};

const getResAndTanksData = (
  offsetNodeIndexes: number,
  count: number,
  dataView: DataView
): [number[], number[]] => {
  const indexes: number[] = [];
  const areas: number[] = [];
  const offsetAreas = offsetNodeIndexes + 4 * count;

  forEachIndex(count, index => {
    const nodeIndex = dataView.getInt32(offsetNodeIndexes + 4 * index, true);
    indexes.push(nodeIndex - 1);
    areas.push(dataView.getFloat32(offsetAreas + 4 * index, true));
  });

  return [indexes, areas];
};

const getLinkTypes = (
  offset: number,
  count: number,
  dataView: DataView
): LinkType[] => {
  const types: LinkType[] = [];

  forEachIndex(count, index => {
    const position = offset + 4 * index;
    const type = dataView.getInt32(position, true);
    types.push(type);
  });

  return types;
};

const getNodeResults = (
  prolog: EpanetProlog,
  offsetResults: number,
  nodeIndex: number,
  dataView: DataView,
  id: string,
  type: NodeType
): NodeResults => {
  const nodeResults = {
    id,
    type,
    demand: [],
    head: [],
    pressure: [],
    waterQuality: [],
  };

  const result: NodeResults = [
    'demand',
    'head',
    'pressure',
    'waterQuality',
  ].reduce((map, obj, i) => {
    return {
      ...map,
      [obj]: getResultByteOffSet(
        prolog,
        offsetResults,
        true,
        nodeIndex,
        i
      ).map(x => dataView.getFloat32(x, true)),
    };
  }, nodeResults);

  return result;
};

const getLinkResults = (
  prolog: EpanetProlog,
  offsetResults: number,
  linkIndex: number,
  dataView: DataView,
  id: string,
  type: LinkType
): LinkResults => {
  const linkResults = {
    id: id,
    type,
    flow: [],
    velocity: [],
    headloss: [],
    avgWaterQuality: [],
    status: [],
    setting: [],
    reactionRate: [],
    friction: [],
  };

  const result: LinkResults = [
    'flow',
    'velocity',
    'headloss',
    'avgWaterQuality',
    'status',
    'setting',
    'reactionRate',
    'friction',
  ].reduce((map, obj, i) => {
    return {
      ...map,
      [obj]: getResultByteOffSet(
        prolog,
        offsetResults,
        false,
        linkIndex,
        i
      ).map(x => dataView.getFloat32(x, true)),
    };
  }, linkResults);

  return result;
};

const getResultByteOffSet = (
  prolog: EpanetProlog,
  offsetResults: number,
  isNode: boolean,
  objIndex: number,
  resultType: NodeResultTypes | LinkResultTypes
): number[] => {
  const linkResultOffset = isNode ? 0 : 16 * prolog.nodeCount;
  const typeCount = isNode ? prolog.nodeCount : prolog.linkCount;
  const resultSize = 16 * prolog.nodeCount + 32 * prolog.linkCount;
  const answer = [...Array(prolog.reportingPeriods)].map(
    (_, i) =>
      offsetResults +
      resultSize * i +
      linkResultOffset +
      4 * objIndex +
      4 * resultType * typeCount
  );
  return answer;
};

const forEachIndex = (count: number, callback: (index: number) => void) => {
  for (let i = 0; i < count; ++i) {
    callback(i);
  }
};

const stringFrom = (arrayBuffer: ArrayBuffer): string => {
  const array = new Uint8Array(arrayBuffer);
  const arrayNumber = Array.from(array).filter(o => o > 0);
  return String.fromCharCode.apply(null, arrayNumber);
};
