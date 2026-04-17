import { ApiFunctionDefinition } from "./types";

export const apiDefinitions: Record<string, ApiFunctionDefinition> = {
  // EN_createproject is handled manually in constructor
  // EN_getversion is handled manually in version check

  init: {
    wasmFunctionName: "_EN_init",
    inputArgDefs: [
      { typeHint: "string", isStringPtr: true }, // reportFile
      { typeHint: "string", isStringPtr: true }, // binaryFile
      { typeHint: "number" }, // hydOption (unitsType in C API)
      { typeHint: "number" }, // qualOption (headlossType in C API)
    ],
    outputArgDefs: [],
  },
  open: {
    wasmFunctionName: "_EN_open",
    inputArgDefs: [
      { typeHint: "string", isStringPtr: true }, // inputFile
      { typeHint: "string", isStringPtr: true }, // reportFile
      { typeHint: "string", isStringPtr: true }, // binaryFile
    ],
    outputArgDefs: [],
  },
  openX: {
    wasmFunctionName: "_EN_openX",
    inputArgDefs: [
      { typeHint: "string", isStringPtr: true }, // inputFile
      { typeHint: "string", isStringPtr: true }, // reportFile
      { typeHint: "string", isStringPtr: true }, // binaryFile
    ],
    outputArgDefs: [],
    minVersion: 20300,
  },
  close: {
    wasmFunctionName: "_EN_close",
    inputArgDefs: [],
    outputArgDefs: [],
  },
  addNode: {
    wasmFunctionName: "_EN_addnode",
    inputArgDefs: [
      { typeHint: "string", isStringPtr: true }, // id
      { typeHint: "enum", isStringPtr: false }, // type (NodeType enum)
    ],
    outputArgDefs: [{ name: "index", type: "int" }],
  },
  getCount: {
    wasmFunctionName: "_EN_getcount",
    inputArgDefs: [{ typeHint: "enum" }], // countType (CountType enum)
    outputArgDefs: [{ name: "count", type: "int" }],
  },
  getNodeIndex: {
    wasmFunctionName: "_EN_getnodeindex",
    inputArgDefs: [{ typeHint: "string", isStringPtr: true }], // id string
    outputArgDefs: [{ name: "index", type: "int" }],
  },
  getNodeValue: {
    wasmFunctionName: "_EN_getnodevalue",
    inputArgDefs: [
      { typeHint: "number" },
      { typeHint: "enum" }, // NodeProperty enum
    ],
    outputArgDefs: [{ name: "value", type: "double" }],
  },
  setNodeValue: {
    wasmFunctionName: "_EN_setnodevalue",
    inputArgDefs: [
      { typeHint: "number" },
      { typeHint: "enum" }, // NodeProperty enum
      { typeHint: "number" }, // value
    ],
    outputArgDefs: [],
  },
  getNodeType: {
    wasmFunctionName: "_EN_getnodetype",
    inputArgDefs: [{ typeHint: "number" }], // index
    outputArgDefs: [{ name: "type", type: "int" }],
  },
  setJunctionData: {
    wasmFunctionName: "_EN_setjuncdata",
    inputArgDefs: [
      { typeHint: "number" }, // nodeIndex
      { typeHint: "number" }, // elev
      { typeHint: "number" }, // demand
      { typeHint: "string", isStringPtr: true }, // patternId string
    ],
    outputArgDefs: [],
  },
  getComment: {
    wasmFunctionName: "_EN_getcomment",
    inputArgDefs: [
      { typeHint: "enum" }, // EN_NODE, EN_LINK, EN_TIMEPAT or EN_CURVE
      { typeHint: "number" }, // index
    ],
    outputArgDefs: [{ name: "comment", type: "char" }],
  },
  setComment: {
    wasmFunctionName: "_EN_setcomment",
    inputArgDefs: [
      { typeHint: "enum" }, // EN_NODE, EN_LINK, EN_TIMEPAT or EN_CURVE
      { typeHint: "number" }, // index
      { typeHint: "string", isStringPtr: true }, // index
    ],
    outputArgDefs: [],
  },
  getTag: {
    wasmFunctionName: "_EN_gettag",
    inputArgDefs: [
      { typeHint: "enum" }, // EN_NODE, EN_LINK
      { typeHint: "number" }, // index
    ],
    outputArgDefs: [
      { name: "out_tag", type: "int" }
    ],
    minVersion: 20300,
  },
  setTag: {
    wasmFunctionName: "_EN_settag",
    inputArgDefs: [
      { typeHint: "enum" }, // EN_NODE, EN_LINK
      { typeHint: "number" }, // index
      { typeHint: "number" }, // tag
    ],
    outputArgDefs: [],
    minVersion: 20300,
  },

  // Node Functions
  deleteNode: {
    wasmFunctionName: "_EN_deletenode",
    inputArgDefs: [
      { typeHint: "number" }, // index
      { typeHint: "enum" }, // actionCode (ActionCodeType enum)
    ],
    outputArgDefs: [],
  },

  getNodeId: {
    wasmFunctionName: "_EN_getnodeid",
    inputArgDefs: [{ typeHint: "number" }], // index
    outputArgDefs: [{ name: "id", type: "char" }],
  },

  setNodeId: {
    wasmFunctionName: "_EN_setnodeid",
    inputArgDefs: [
      { typeHint: "number" }, // index
      { typeHint: "string", isStringPtr: true }, // newid
    ],
    outputArgDefs: [],
  },

  setTankData: {
    wasmFunctionName: "_EN_settankdata",
    inputArgDefs: [
      { typeHint: "number" }, // index
      { typeHint: "number" }, // elev
      { typeHint: "number" }, // initlvl
      { typeHint: "number" }, // minlvl
      { typeHint: "number" }, // maxlvl
      { typeHint: "number" }, // diam
      { typeHint: "number" }, // minvol
      { typeHint: "string", isStringPtr: true }, // volcurve
    ],
    outputArgDefs: [],
  },

  getCoordinates: {
    wasmFunctionName: "_EN_getcoord",
    inputArgDefs: [{ typeHint: "number" }], // index
    outputArgDefs: [
      { name: "x", type: "double" },
      { name: "y", type: "double" },
    ],
  },

  setCoordinates: {
    wasmFunctionName: "_EN_setcoord",
    inputArgDefs: [
      { typeHint: "number" }, // index
      { typeHint: "number" }, // x
      { typeHint: "number" }, // y
    ],
    outputArgDefs: [],
  },

  // Hydraulic Analysis Functions
  solveH: {
    wasmFunctionName: "_EN_solveH",
    inputArgDefs: [],
    outputArgDefs: [],
  },

  useHydFile: {
    wasmFunctionName: "_EN_usehydfile",
    inputArgDefs: [
      { typeHint: "string", isStringPtr: true }, // filename
    ],
    outputArgDefs: [],
  },

  openH: {
    wasmFunctionName: "_EN_openH",
    inputArgDefs: [],
    outputArgDefs: [],
  },

  initH: {
    wasmFunctionName: "_EN_initH",
    inputArgDefs: [
      { typeHint: "enum" }, // initFlag (InitHydOption enum)
    ],
    outputArgDefs: [],
  },

  runH: {
    wasmFunctionName: "_EN_runH",
    inputArgDefs: [],
    outputArgDefs: [{ name: "currentTime", type: "int" }],
  },

  nextH: {
    wasmFunctionName: "_EN_nextH",
    inputArgDefs: [],
    outputArgDefs: [{ name: "tStep", type: "int" }],
  },

  saveH: {
    wasmFunctionName: "_EN_saveH",
    inputArgDefs: [],
    outputArgDefs: [],
  },

  saveHydFile: {
    wasmFunctionName: "_EN_savehydfile",
    inputArgDefs: [
      { typeHint: "string", isStringPtr: true }, // filename
    ],
    outputArgDefs: [],
  },

  closeH: {
    wasmFunctionName: "_EN_closeH",
    inputArgDefs: [],
    outputArgDefs: [],
  },

  // Network Link Functions
  addLink: {
    wasmFunctionName: "_EN_addlink",
    inputArgDefs: [
      { typeHint: "string", isStringPtr: true }, // id
      { typeHint: "enum" }, // linkType (LinkType enum)
      { typeHint: "string", isStringPtr: true }, // fromNode
      { typeHint: "string", isStringPtr: true }, // toNode
    ],
    outputArgDefs: [{ name: "index", type: "int" }],
  },

  deleteLink: {
    wasmFunctionName: "_EN_deletelink",
    inputArgDefs: [
      { typeHint: "number" }, // index
      { typeHint: "enum" }, // actionCode (ActionCodeType enum)
    ],
    outputArgDefs: [],
  },

  getLinkIndex: {
    wasmFunctionName: "_EN_getlinkindex",
    inputArgDefs: [{ typeHint: "string", isStringPtr: true }], // id
    outputArgDefs: [{ name: "index", type: "int" }],
  },

  getLinkId: {
    wasmFunctionName: "_EN_getlinkid",
    inputArgDefs: [{ typeHint: "number" }], // index
    outputArgDefs: [{ name: "id", type: "char" }],
  },

  setLinkId: {
    wasmFunctionName: "_EN_setlinkid",
    inputArgDefs: [
      { typeHint: "number" }, // index
      { typeHint: "string", isStringPtr: true }, // newid
    ],
    outputArgDefs: [],
  },

  getLinkType: {
    wasmFunctionName: "_EN_getlinktype",
    inputArgDefs: [{ typeHint: "number" }], // index
    outputArgDefs: [{ name: "type", type: "int" }],
  },

  getLinkNodes: {
    wasmFunctionName: "_EN_getlinknodes",
    inputArgDefs: [{ typeHint: "number" }], // index
    outputArgDefs: [
      { name: "node1", type: "int" },
      { name: "node2", type: "int" },
    ],
  },

  setLinkNodes: {
    wasmFunctionName: "_EN_setlinknodes",
    inputArgDefs: [
      { typeHint: "number" }, // index
      { typeHint: "number" }, // node1
      { typeHint: "number" }, // node2
    ],
    outputArgDefs: [],
  },

  getLinkValue: {
    wasmFunctionName: "_EN_getlinkvalue",
    inputArgDefs: [
      { typeHint: "number" }, // index
      { typeHint: "enum" }, // property (LinkProperty enum)
    ],
    outputArgDefs: [{ name: "value", type: "double" }],
  },

  setLinkValue: {
    wasmFunctionName: "_EN_setlinkvalue",
    inputArgDefs: [
      { typeHint: "number" }, // index
      { typeHint: "enum" }, // property (LinkProperty enum)
      { typeHint: "number" }, // value
    ],
    outputArgDefs: [],
  },

  setPipeData: {
    wasmFunctionName: "_EN_setpipedata",
    inputArgDefs: [
      { typeHint: "number" }, // index
      { typeHint: "number" }, // length
      { typeHint: "number" }, // diam
      { typeHint: "number" }, // rough
      { typeHint: "number" }, // mloss
    ],
    outputArgDefs: [],
  },

  getPumpType: {
    wasmFunctionName: "_EN_getpumptype",
    inputArgDefs: [{ typeHint: "number" }], // index
    outputArgDefs: [{ name: "type", type: "int" }],
  },

  getHeadCurveIndex: {
    wasmFunctionName: "_EN_getheadcurveindex",
    inputArgDefs: [{ typeHint: "number" }], // linkIndex
    outputArgDefs: [{ name: "curveIndex", type: "int" }],
  },

  setHeadCurveIndex: {
    wasmFunctionName: "_EN_setheadcurveindex",
    inputArgDefs: [
      { typeHint: "number" }, // linkIndex
      { typeHint: "number" }, // curveIndex
    ],
    outputArgDefs: [],
  },

  getVertexCount: {
    wasmFunctionName: "_EN_getvertexcount",
    inputArgDefs: [{ typeHint: "number" }], // index
    outputArgDefs: [{ name: "count", type: "int" }],
  },

  getVertex: {
    wasmFunctionName: "_EN_getvertex",
    inputArgDefs: [
      { typeHint: "number" }, // index
      { typeHint: "number" }, // vertex
    ],
    outputArgDefs: [
      { name: "x", type: "double" },
      { name: "y", type: "double" },
    ],
  },

  setVertex: {
    wasmFunctionName: "_EN_setvertex",
    inputArgDefs: [
      { typeHint: "number" }, // index
      { typeHint: "number" }, // vertex
      { typeHint: "number" }, // x
      { typeHint: "number" }, // y
    ],
    outputArgDefs: [],
    minVersion: 20300,
  },

  setVertices: {
    wasmFunctionName: "_EN_setvertices",
    inputArgDefs: [
      { typeHint: "number" }, // index
      { typeHint: "double[]" }, // x array
      { typeHint: "double[]" }, // y array
      { typeHint: "length" }, // count (automatically calculated from x array)
    ],
    outputArgDefs: [],
  },

  // Project Functions
  getTitle: {
    wasmFunctionName: "_EN_gettitle",
    inputArgDefs: [],
    outputArgDefs: [
      { name: "line1", type: "char-title" },
      { name: "line2", type: "char-title" },
      { name: "line3", type: "char-title" },
    ],
  },

  setTitle: {
    wasmFunctionName: "_EN_settitle",
    inputArgDefs: [
      { typeHint: "string", isStringPtr: true }, // line1
      { typeHint: "string", isStringPtr: true }, // line2
      { typeHint: "string", isStringPtr: true }, // line3
    ],
    outputArgDefs: [],
  },

  saveInpFile: {
    wasmFunctionName: "_EN_saveinpfile",
    inputArgDefs: [{ typeHint: "string", isStringPtr: true }], // filename
    outputArgDefs: [],
  },

  runProject: {
    wasmFunctionName: "_EN_runproject",
    inputArgDefs: [
      { typeHint: "string", isStringPtr: true }, // inputFile
      { typeHint: "string", isStringPtr: true }, // reportFile
      { typeHint: "string", isStringPtr: true }, // outputFile
    ],
    outputArgDefs: [],
  },

  // Reporting Functions
  writeLine: {
    wasmFunctionName: "_EN_writeline",
    inputArgDefs: [{ typeHint: "string", isStringPtr: true }], // line
    outputArgDefs: [],
  },

  report: {
    wasmFunctionName: "_EN_report",
    inputArgDefs: [],
    outputArgDefs: [],
  },

  copyReport: {
    wasmFunctionName: "_EN_copyreport",
    inputArgDefs: [{ typeHint: "string", isStringPtr: true }], // filename
    outputArgDefs: [],
  },

  clearReport: {
    wasmFunctionName: "_EN_clearreport",
    inputArgDefs: [],
    outputArgDefs: [],
  },

  resetReport: {
    wasmFunctionName: "_EN_resetreport",
    inputArgDefs: [],
    outputArgDefs: [],
  },

  setReport: {
    wasmFunctionName: "_EN_setreport",
    inputArgDefs: [{ typeHint: "string", isStringPtr: true }], // format
    outputArgDefs: [],
  },

  setStatusReport: {
    wasmFunctionName: "_EN_setstatusreport",
    inputArgDefs: [{ typeHint: "enum" }], // level (StatusReport enum)
    outputArgDefs: [],
  },

  getStatistic: {
    wasmFunctionName: "_EN_getstatistic",
    inputArgDefs: [{ typeHint: "enum" }], // type (AnalysisStatistic enum)
    outputArgDefs: [{ name: "value", type: "double" }],
  },

  timeToNextEvent: {
    wasmFunctionName: "_EN_timetonextevent",
    inputArgDefs: [],
    outputArgDefs: [
      { name: "eventType", type: "int" },
      { name: "duration", type: "int" },
      { name: "elementIndex", type: "int" },
    ],
    minVersion: 20300,
  },

  getResultIndex: {
    wasmFunctionName: "_EN_getresultindex",
    inputArgDefs: [
      { typeHint: "enum" }, // type (ObjectType enum)
      { typeHint: "number" }, // index
    ],
    outputArgDefs: [{ name: "resultIndex", type: "int" }],
  },

  // Time Pattern Functions
  addPattern: {
    wasmFunctionName: "_EN_addpattern",
    inputArgDefs: [{ typeHint: "string", isStringPtr: true }], // id
    outputArgDefs: [],
  },

  deletePattern: {
    wasmFunctionName: "_EN_deletepattern",
    inputArgDefs: [{ typeHint: "number" }], // index
    outputArgDefs: [],
  },

  getPatternIndex: {
    wasmFunctionName: "_EN_getpatternindex",
    inputArgDefs: [{ typeHint: "string", isStringPtr: true }], // id
    outputArgDefs: [{ name: "index", type: "int" }],
  },

  getPatternId: {
    wasmFunctionName: "_EN_getpatternid",
    inputArgDefs: [{ typeHint: "number" }], // index
    outputArgDefs: [{ name: "id", type: "char" }],
  },

  setPatternId: {
    wasmFunctionName: "_EN_setpatternid",
    inputArgDefs: [
      { typeHint: "number" }, // index
      { typeHint: "string", isStringPtr: true }, // id
    ],
    outputArgDefs: [],
  },

  getPatternLength: {
    wasmFunctionName: "_EN_getpatternlen",
    inputArgDefs: [{ typeHint: "number" }], // index
    outputArgDefs: [{ name: "length", type: "int" }],
  },

  getPatternValue: {
    wasmFunctionName: "_EN_getpatternvalue",
    inputArgDefs: [
      { typeHint: "number" }, // index
      { typeHint: "number" }, // period
    ],
    outputArgDefs: [{ name: "value", type: "double" }],
  },

  setPatternValue: {
    wasmFunctionName: "_EN_setpatternvalue",
    inputArgDefs: [
      { typeHint: "number" }, // index
      { typeHint: "number" }, // period
      { typeHint: "number" }, // value
    ],
    outputArgDefs: [],
  },

  getAveragePatternValue: {
    wasmFunctionName: "_EN_getaveragepatternvalue",
    inputArgDefs: [{ typeHint: "number" }], // index
    outputArgDefs: [{ name: "value", type: "double" }],
  },

  setPattern: {
    wasmFunctionName: "_EN_setpattern",
    inputArgDefs: [
      { typeHint: "number" }, // index
      { typeHint: "double[]" }, // values array
      { typeHint: "length" }, // count (automatically calculated from values array)
    ],
    outputArgDefs: [],
  },

  loadPatternFile: {
    wasmFunctionName: "_EN_loadpatternfile",
    inputArgDefs: [
      { typeHint: "string", isStringPtr: true }, // filename
      { typeHint: "number" }, // id
    ],
    outputArgDefs: [],
    minVersion: 20300,
  },

  // Water Quality Analysis Functions
  solveQ: {
    wasmFunctionName: "_EN_solveQ",
    inputArgDefs: [],
    outputArgDefs: [],
  },

  openQ: {
    wasmFunctionName: "_EN_openQ",
    inputArgDefs: [],
    outputArgDefs: [],
  },

  initQ: {
    wasmFunctionName: "_EN_initQ",
    inputArgDefs: [{ typeHint: "enum" }], // initFlag (InitHydOption enum)
    outputArgDefs: [],
  },

  runQ: {
    wasmFunctionName: "_EN_runQ",
    inputArgDefs: [],
    outputArgDefs: [{ name: "currentTime", type: "int" }],
  },

  nextQ: {
    wasmFunctionName: "_EN_nextQ",
    inputArgDefs: [],
    outputArgDefs: [{ name: "tStep", type: "int" }],
  },

  stepQ: {
    wasmFunctionName: "_EN_stepQ",
    inputArgDefs: [],
    outputArgDefs: [{ name: "tStep", type: "int" }],
  },

  closeQ: {
    wasmFunctionName: "_EN_closeQ",
    inputArgDefs: [],
    outputArgDefs: [],
  },

  // Analysis Options Functions
  getFlowUnits: {
    wasmFunctionName: "_EN_getflowunits",
    inputArgDefs: [],
    outputArgDefs: [{ name: "units", type: "int" }],
  },

  getOption: {
    wasmFunctionName: "_EN_getoption",
    inputArgDefs: [{ typeHint: "enum" }], // option (Option enum)
    outputArgDefs: [{ name: "value", type: "double" }],
  },

  getQualityInfo: {
    wasmFunctionName: "_EN_getqualinfo",
    inputArgDefs: [],
    outputArgDefs: [
      { name: "qualType", type: "int" },
      { name: "chemName", type: "char" },
      { name: "chemUnits", type: "char" },
      { name: "traceNode", type: "int" },
    ],
  },

  getQualityType: {
    wasmFunctionName: "_EN_getqualtype",
    inputArgDefs: [],
    outputArgDefs: [
      { name: "qualType", type: "int" },
      { name: "traceNode", type: "int" },
    ],
  },

  getTimeParameter: {
    wasmFunctionName: "_EN_gettimeparam",
    inputArgDefs: [{ typeHint: "enum" }], // param (TimeParameter enum)
    outputArgDefs: [{ name: "value", type: "int" }],
  },

  setFlowUnits: {
    wasmFunctionName: "_EN_setflowunits",
    inputArgDefs: [{ typeHint: "enum" }], // units (FlowUnits enum)
    outputArgDefs: [],
  },

  setOption: {
    wasmFunctionName: "_EN_setoption",
    inputArgDefs: [
      { typeHint: "enum" }, // option (Option enum)
      { typeHint: "number" }, // value
    ],
    outputArgDefs: [],
  },

  setQualityType: {
    wasmFunctionName: "_EN_setqualtype",
    inputArgDefs: [
      { typeHint: "enum" }, // qualType (QualityType enum)
      { typeHint: "string", isStringPtr: true }, // chemName
      { typeHint: "string", isStringPtr: true }, // chemUnits
      { typeHint: "string", isStringPtr: true }, // traceNode
    ],
    outputArgDefs: [],
  },

  setTimeParameter: {
    wasmFunctionName: "_EN_settimeparam",
    inputArgDefs: [
      { typeHint: "enum" }, // param (TimeParameter enum)
      { typeHint: "number" }, // value
    ],
    outputArgDefs: [],
  },

  // Nodal Demand Functions
  addDemand: {
    wasmFunctionName: "_EN_adddemand",
    inputArgDefs: [
      { typeHint: "number" }, // nodeIndex
      { typeHint: "number" }, // baseDemand
      { typeHint: "string", isStringPtr: true }, // demandPattern
      { typeHint: "string", isStringPtr: true }, // demandName
    ],
    outputArgDefs: [],
  },

  deleteDemand: {
    wasmFunctionName: "_EN_deletedemand",
    inputArgDefs: [
      { typeHint: "number" }, // nodeIndex
      { typeHint: "number" }, // demandIndex
    ],
    outputArgDefs: [],
  },

  getBaseDemand: {
    wasmFunctionName: "_EN_getbasedemand",
    inputArgDefs: [
      { typeHint: "number" }, // nodeIndex
      { typeHint: "number" }, // demandIndex
    ],
    outputArgDefs: [{ name: "baseDemand", type: "double" }],
  },

  getDemandIndex: {
    wasmFunctionName: "_EN_getdemandindex",
    inputArgDefs: [
      { typeHint: "number" }, // nodeIndex
      { typeHint: "string", isStringPtr: true }, // demandName
    ],
    outputArgDefs: [{ name: "demandIndex", type: "int" }],
  },

  getDemandModel: {
    wasmFunctionName: "_EN_getdemandmodel",
    inputArgDefs: [],
    outputArgDefs: [
      { name: "type", type: "int" },
      { name: "pmin", type: "double" },
      { name: "preq", type: "double" },
      { name: "pexp", type: "double" },
    ],
  },

  getDemandName: {
    wasmFunctionName: "_EN_getdemandname",
    inputArgDefs: [
      { typeHint: "number" }, // nodeIndex
      { typeHint: "number" }, // demandIndex
    ],
    outputArgDefs: [{ name: "demandName", type: "char" }],
  },

  getDemandPattern: {
    wasmFunctionName: "_EN_getdemandpattern",
    inputArgDefs: [
      { typeHint: "number" }, // nodeIndex
      { typeHint: "number" }, // demandIndex
    ],
    outputArgDefs: [{ name: "patternIndex", type: "int" }],
  },

  getNumberOfDemands: {
    wasmFunctionName: "_EN_getnumdemands",
    inputArgDefs: [{ typeHint: "number" }], // nodeIndex
    outputArgDefs: [{ name: "numDemands", type: "int" }],
  },

  setBaseDemand: {
    wasmFunctionName: "_EN_setbasedemand",
    inputArgDefs: [
      { typeHint: "number" }, // nodeIndex
      { typeHint: "number" }, // demandIndex
      { typeHint: "number" }, // baseDemand
    ],
    outputArgDefs: [],
  },

  setDemandModel: {
    wasmFunctionName: "_EN_setdemandmodel",
    inputArgDefs: [
      { typeHint: "enum" }, // type (DemandModel enum)
      { typeHint: "number" }, // pmin
      { typeHint: "number" }, // preq
      { typeHint: "number" }, // pexp
    ],
    outputArgDefs: [],
  },

  setDemandName: {
    wasmFunctionName: "_EN_setdemandname",
    inputArgDefs: [
      { typeHint: "number" }, // nodeIndex
      { typeHint: "number" }, // demandIdx
      { typeHint: "string", isStringPtr: true }, // demandName
    ],
    outputArgDefs: [],
  },

  setDemandPattern: {
    wasmFunctionName: "_EN_setdemandpattern",
    inputArgDefs: [
      { typeHint: "number" }, // nodeIndex
      { typeHint: "number" }, // demandIndex
      { typeHint: "number" }, // patIndex
    ],
    outputArgDefs: [],
  },

  // Simple Control Functions
  addControl: {
    wasmFunctionName: "_EN_addcontrol",
    inputArgDefs: [
      { typeHint: "enum" }, // type (ControlType enum)
      { typeHint: "number" }, // linkIndex
      { typeHint: "number" }, // setting
      { typeHint: "number" }, // nodeIndex
      { typeHint: "number" }, // level
    ],
    outputArgDefs: [{ name: "controlIndex", type: "int" }],
  },

  deleteControl: {
    wasmFunctionName: "_EN_deletecontrol",
    inputArgDefs: [{ typeHint: "number" }], // index
    outputArgDefs: [],
  },

  getControl: {
    wasmFunctionName: "_EN_getcontrol",
    inputArgDefs: [{ typeHint: "number" }], // index
    outputArgDefs: [
      { name: "type", type: "int" },
      { name: "linkIndex", type: "int" },
      { name: "setting", type: "double" },
      { name: "nodeIndex", type: "int" },
      { name: "level", type: "double" },
    ],
  },

  setControl: {
    wasmFunctionName: "_EN_setcontrol",
    inputArgDefs: [
      { typeHint: "number" }, // index
      { typeHint: "enum" }, // type (ControlType enum)
      { typeHint: "number" }, // linkIndex
      { typeHint: "number" }, // setting
      { typeHint: "number" }, // nodeIndex
      { typeHint: "number" }, // level
    ],
    outputArgDefs: [],
  },

  getControlEnabled: {
    wasmFunctionName: "_EN_getcontrolenabled",
    inputArgDefs: [
      { typeHint: "number" }, // index
    ],
    outputArgDefs: [{ name: "out_enabled", type: "int" }],
    minVersion: 20300,
  },

  setControlEnabled: {
    wasmFunctionName: "_EN_setcontrolenabled",
    inputArgDefs: [
      { typeHint: "number" }, // index
      { typeHint: "number" }, // enabled
    ],
    outputArgDefs: [],
    minVersion: 20300,
  },

  // Rule-Based Control Functions
  addRule: {
    wasmFunctionName: "_EN_addrule",
    inputArgDefs: [{ typeHint: "string", isStringPtr: true }], // rule
    outputArgDefs: [],
  },

  deleteRule: {
    wasmFunctionName: "_EN_deleterule",
    inputArgDefs: [{ typeHint: "number" }], // index
    outputArgDefs: [],
  },

  getRule: {
    wasmFunctionName: "_EN_getrule",
    inputArgDefs: [{ typeHint: "number" }], // index
    outputArgDefs: [
      { name: "premiseCount", type: "int" },
      { name: "thenActionCount", type: "int" },
      { name: "elseActionCount", type: "int" },
      { name: "priority", type: "double" },
    ],
  },

  getRuleId: {
    wasmFunctionName: "_EN_getruleID",
    inputArgDefs: [{ typeHint: "number" }], // index
    outputArgDefs: [{ name: "id", type: "char" }],
  },

  getPremise: {
    wasmFunctionName: "_EN_getpremise",
    inputArgDefs: [
      { typeHint: "number" }, // ruleIndex
      { typeHint: "number" }, // premiseIndex
    ],
    outputArgDefs: [
      { name: "logop", type: "int" },
      { name: "object", type: "int" },
      { name: "objIndex", type: "int" },
      { name: "variable", type: "int" },
      { name: "relop", type: "int" },
      { name: "status", type: "int" },
      { name: "value", type: "double" },
    ],
  },

  setPremise: {
    wasmFunctionName: "_EN_setpremise",
    inputArgDefs: [
      { typeHint: "number" }, // ruleIndex
      { typeHint: "number" }, // premiseIndex
      { typeHint: "number" }, // logop
      { typeHint: "enum" }, // object (RuleObject enum)
      { typeHint: "number" }, // objIndex
      { typeHint: "enum" }, // variable (RuleVariable enum)
      { typeHint: "enum" }, // relop (RuleOperator enum)
      { typeHint: "enum" }, // status (RuleStatus enum)
      { typeHint: "number" }, // value
    ],
    outputArgDefs: [],
  },

  setPremiseIndex: {
    wasmFunctionName: "_EN_setpremiseindex",
    inputArgDefs: [
      { typeHint: "number" }, // ruleIndex
      { typeHint: "number" }, // premiseIndex
      { typeHint: "number" }, // objIndex
    ],
    outputArgDefs: [],
  },

  setPremiseStatus: {
    wasmFunctionName: "_EN_setpremisestatus",
    inputArgDefs: [
      { typeHint: "number" }, // ruleIndex
      { typeHint: "number" }, // premiseIndex
      { typeHint: "enum" }, // status (RuleStatus enum)
    ],
    outputArgDefs: [],
  },

  setPremiseValue: {
    wasmFunctionName: "_EN_setpremisevalue",
    inputArgDefs: [
      { typeHint: "number" }, // ruleIndex
      { typeHint: "number" }, // premiseIndex
      { typeHint: "number" }, // value
    ],
    outputArgDefs: [],
  },

  getThenAction: {
    wasmFunctionName: "_EN_getthenaction",
    inputArgDefs: [
      { typeHint: "number" }, // ruleIndex
      { typeHint: "number" }, // actionIndex
    ],
    outputArgDefs: [
      { name: "linkIndex", type: "int" },
      { name: "status", type: "int" },
      { name: "setting", type: "double" },
    ],
  },

  setThenAction: {
    wasmFunctionName: "_EN_setthenaction",
    inputArgDefs: [
      { typeHint: "number" }, // ruleIndex
      { typeHint: "number" }, // actionIndex
      { typeHint: "number" }, // linkIndex
      { typeHint: "enum" }, // status (RuleStatus enum)
      { typeHint: "number" }, // setting
    ],
    outputArgDefs: [],
  },

  getElseAction: {
    wasmFunctionName: "_EN_getelseaction",
    inputArgDefs: [
      { typeHint: "number" }, // ruleIndex
      { typeHint: "number" }, // actionIndex
    ],
    outputArgDefs: [
      { name: "linkIndex", type: "int" },
      { name: "status", type: "int" },
      { name: "setting", type: "double" },
    ],
  },

  setElseAction: {
    wasmFunctionName: "_EN_setelseaction",
    inputArgDefs: [
      { typeHint: "number" }, // ruleIndex
      { typeHint: "number" }, // actionIndex
      { typeHint: "number" }, // linkIndex
      { typeHint: "enum" }, // status (RuleStatus enum)
      { typeHint: "number" }, // setting
    ],
    outputArgDefs: [],
  },

  setRulePriority: {
    wasmFunctionName: "_EN_setrulepriority",
    inputArgDefs: [
      { typeHint: "number" }, // index
      { typeHint: "number" }, // priority
    ],
    outputArgDefs: [],
  },

  getRuleEnabled: {
    wasmFunctionName: "_EN_getruleenabled",
    inputArgDefs: [
      { typeHint: "number" }, // index
    ],
    outputArgDefs: [{ name: "out_enabled", type: "int" }],
    minVersion: 20300,
  },

  setRuleEnabled: {
    wasmFunctionName: "_EN_setruleenabled",
    inputArgDefs: [
      { typeHint: "number" }, // index
      { typeHint: "number" }, // enabled
    ],
    outputArgDefs: [],
    minVersion: 20300,
  },

  // Data Curve Functions
  addCurve: {
    wasmFunctionName: "_EN_addcurve",
    inputArgDefs: [{ typeHint: "string", isStringPtr: true }], // id
    outputArgDefs: [],
  },

  deleteCurve: {
    wasmFunctionName: "_EN_deletecurve",
    inputArgDefs: [{ typeHint: "number" }], // index
    outputArgDefs: [],
  },

  getCurveIndex: {
    wasmFunctionName: "_EN_getcurveindex",
    inputArgDefs: [{ typeHint: "string", isStringPtr: true }], // id
    outputArgDefs: [{ name: "index", type: "int" }],
  },

  getCurveId: {
    wasmFunctionName: "_EN_getcurveid",
    inputArgDefs: [{ typeHint: "number" }], // index
    outputArgDefs: [{ name: "id", type: "char" }],
  },

  setCurveId: {
    wasmFunctionName: "_EN_setcurveid",
    inputArgDefs: [
      { typeHint: "number" }, // index
      { typeHint: "string", isStringPtr: true }, // id
    ],
    outputArgDefs: [],
  },

  getCurveLenth: {
    wasmFunctionName: "_EN_getcurvelen",
    inputArgDefs: [{ typeHint: "number" }], // index
    outputArgDefs: [{ name: "length", type: "int" }],
  },

  getCurveType: {
    wasmFunctionName: "_EN_getcurvetype",
    inputArgDefs: [{ typeHint: "number" }], // index
    outputArgDefs: [{ name: "type", type: "int" }],
  },

  setCurveType: {
    wasmFunctionName: "_EN_setcurvetype",
    inputArgDefs: [
      { typeHint: "number" }, // index,
      { typeHint: "enum" } // type
    ],
    outputArgDefs: [],
    minVersion: 20300,
  },

  getCurveValue: {
    wasmFunctionName: "_EN_getcurvevalue",
    inputArgDefs: [
      { typeHint: "number" }, // curveIndex
      { typeHint: "number" }, // pointIndex
    ],
    outputArgDefs: [
      { name: "x", type: "double" },
      { name: "y", type: "double" },
    ],
  },

  setCurveValue: {
    wasmFunctionName: "_EN_setcurvevalue",
    inputArgDefs: [
      { typeHint: "number" }, // curveIndex
      { typeHint: "number" }, // pointIndex
      { typeHint: "number" }, // x
      { typeHint: "number" }, // y
    ],
    outputArgDefs: [],
  },

  setCurve: {
    wasmFunctionName: "_EN_setcurve",
    inputArgDefs: [
      { typeHint: "number" }, // index
      { typeHint: "double[]" }, // xValues array
      { typeHint: "double[]" }, // yValues array
      { typeHint: "length" }, // count (automatically calculated from xValues array)
    ],
    outputArgDefs: [],
  },

  // MSX functions
  msxOpen: {
    wasmFunctionName: "_MSXopen",
    inputArgDefs: [
      { typeHint: "string", isStringPtr: true }, // fname
    ],
    outputArgDefs: [],
    msxRequired: true
  },

  msxSolveH: {
    wasmFunctionName: "_MSXsolveH",
    inputArgDefs: [],
    outputArgDefs: [],
    msxRequired: true,
    prependProjectHandle: false,
  },

  msxUseHydFile: {
    wasmFunctionName: "_MSXusehydfile",
    inputArgDefs: [
      { typeHint: "string", isStringPtr: true }, // fname
    ],
    outputArgDefs: [],
    msxRequired: true,
    prependProjectHandle: false,
  },

  msxSolveQ: {
    wasmFunctionName: "_MSXsolveQ",
    inputArgDefs: [],
    outputArgDefs: [],
    msxRequired: true,
    prependProjectHandle: false,
  },

  msxInit: {
    wasmFunctionName: "_MSXinit",
    inputArgDefs: [
      { typeHint: "number" }, // saveFlag
    ],
    outputArgDefs: [],
    msxRequired: true,
    prependProjectHandle: false,
  },

  msxStep: {
    wasmFunctionName: "_MSXstep",
    inputArgDefs: [],
    outputArgDefs: [
      { name: "t", type: "double" },
      { name: "tleft", type: "double" },
    ],
    msxRequired: true,
    prependProjectHandle: false,
  },

  msxSaveOutFile: {
    wasmFunctionName: "_MSXsaveoutfile",
    inputArgDefs: [
      { typeHint: "string", isStringPtr: true }, // fname
    ],
    outputArgDefs: [],
    msxRequired: true,
    prependProjectHandle: false,
  },

  msxSaveMsxFile: {
    wasmFunctionName: "_MSXsavemsxfile",
    inputArgDefs: [
      { typeHint: "string", isStringPtr: true }, // fname
    ],
    outputArgDefs: [],
    msxRequired: true,
    prependProjectHandle: false,
  },

  msxReport: {
    wasmFunctionName: "_MSXreport",
    inputArgDefs: [],
    outputArgDefs: [],
    msxRequired: true,
    prependProjectHandle: false,
  },

  msxClose: {
    wasmFunctionName: "_MSXclose",
    inputArgDefs: [],
    outputArgDefs: [],
    msxRequired: true,
    prependProjectHandle: false,
  },

  msxENOpen: {
    wasmFunctionName: "_MSXENopen",
    inputArgDefs: [
      { typeHint: "string", isStringPtr: true }, // inpFile
      { typeHint: "string", isStringPtr: true }, // rptFile
      { typeHint: "string", isStringPtr: true }, // outFile
    ],
    outputArgDefs: [],
    msxRequired: true,
  },

  msxENClose: {
    wasmFunctionName: "_MSXENclose",
    inputArgDefs: [],
    outputArgDefs: [],
    msxRequired: true,
  },

  msxGetIndex: {
    wasmFunctionName: "_MSXgetindex",
    inputArgDefs: [
      { typeHint: "enum" },                      // type (object type code)
      { typeHint: "string", isStringPtr: true }, // id (name to look up)
    ],
    outputArgDefs: [{ name: "index", type: "int" }],
    msxRequired: true,
    prependProjectHandle: false,
  },

  msxGetIDLen: {
    wasmFunctionName: "_MSXgetIDlen",
    inputArgDefs: [
      { typeHint: "enum" },   // type
      { typeHint: "number" }, // index
    ],
    outputArgDefs: [{ name: "len", type: "int" }],
    msxRequired: true,
    prependProjectHandle: false,
  },

  msxGetCount: {
    wasmFunctionName: "_MSXgetcount",
    inputArgDefs: [{ typeHint: "enum" }], // type
    outputArgDefs: [{ name: "count", type: "int" }],
    msxRequired: true,
    prependProjectHandle: false,
  },

  msxGetSpecies: {
    wasmFunctionName: "_MSXgetspecies",
    inputArgDefs: [{ typeHint: "number" }], // index
    outputArgDefs: [
      { name: "type",  type: "int"    }, // MSX_BULK or MSX_WALL
      { name: "units", type: "char"   }, // mass units string
      { name: "aTol",  type: "double" }, // absolute tolerance
      { name: "rTol",  type: "double" }, // relative tolerance
    ],
    msxRequired: true,
    prependProjectHandle: false,
  },

  msxGetConstant: {
    wasmFunctionName: "_MSXgetconstant",
    inputArgDefs: [{ typeHint: "number" }], // index
    outputArgDefs: [{ name: "value", type: "double" }],
    msxRequired: true,
    prependProjectHandle: false,
  },

  msxGetParameter: {
    wasmFunctionName: "_MSXgetparameter",
    inputArgDefs: [
      { typeHint: "enum" },   // type (MSX_NODE or MSX_LINK)
      { typeHint: "number" }, // index
      { typeHint: "number" }, // param
    ],
    outputArgDefs: [{ name: "value", type: "double" }],
    msxRequired: true,
    prependProjectHandle: false,
  },

  msxGetSource: {
    wasmFunctionName: "_MSXgetsource",
    inputArgDefs: [
      { typeHint: "number" }, // node
      { typeHint: "number" }, // species
    ],
    outputArgDefs: [
      { name: "type",  type: "int"    }, // source type code
      { name: "level", type: "double" }, // baseline concentration
      { name: "pat",   type: "int"    }, // pattern index
    ],
    msxRequired: true,
    prependProjectHandle: false,
  },

  msxGetPatternLen: {
    wasmFunctionName: "_MSXgetpatternlen",
    inputArgDefs: [{ typeHint: "number" }], // pat
    outputArgDefs: [{ name: "len", type: "int" }],
    msxRequired: true,
    prependProjectHandle: false,
  },

  msxGetPatternValue: {
    wasmFunctionName: "_MSXgetpatternvalue",
    inputArgDefs: [
      { typeHint: "number" }, // pat
      { typeHint: "number" }, // period
    ],
    outputArgDefs: [{ name: "value", type: "double" }],
    msxRequired: true,
    prependProjectHandle: false,
  },

  msxGetInitQual: {
    wasmFunctionName: "_MSXgetinitqual",
    inputArgDefs: [
      { typeHint: "enum" },   // type (MSX_NODE or MSX_LINK)
      { typeHint: "number" }, // index
      { typeHint: "number" }, // species
    ],
    outputArgDefs: [{ name: "value", type: "double" }],
    msxRequired: true,
    prependProjectHandle: false,
  },

  msxGetQual: {
    wasmFunctionName: "_MSXgetqual",
    inputArgDefs: [
      { typeHint: "enum" },   // type (MSX_NODE or MSX_LINK)
      { typeHint: "number" }, // index
      { typeHint: "number" }, // species
    ],
    outputArgDefs: [{ name: "value", type: "double" }],
    msxRequired: true,
    prependProjectHandle: false,
  },

  msxSetConstant: {
    wasmFunctionName: "_MSXsetconstant",
    inputArgDefs: [
      { typeHint: "number" }, // index
      { typeHint: "number" }, // value
    ],
    outputArgDefs: [],
    msxRequired: true,
    prependProjectHandle: false,
  },

  msxSetParameter: {
    wasmFunctionName: "_MSXsetparameter",
    inputArgDefs: [
      { typeHint: "enum" },   // type (MSX_NODE or MSX_LINK)
      { typeHint: "number" }, // index
      { typeHint: "number" }, // param
      { typeHint: "number" }, // value
    ],
    outputArgDefs: [],
    msxRequired: true,
    prependProjectHandle: false,
  },

  msxSetInitQual: {
    wasmFunctionName: "_MSXsetinitqual",
    inputArgDefs: [
      { typeHint: "enum" },   // type (MSX_NODE or MSX_LINK)
      { typeHint: "number" }, // index
      { typeHint: "number" }, // species
      { typeHint: "number" }, // value
    ],
    outputArgDefs: [],
    msxRequired: true,
    prependProjectHandle: false,
  },

  msxSetSource: {
    wasmFunctionName: "_MSXsetsource",
    inputArgDefs: [
      { typeHint: "number" }, // node
      { typeHint: "number" }, // species
      { typeHint: "enum" },   // type (MSX_NOSOURCE, MSX_CONCEN, etc.)
      { typeHint: "number" }, // level
      { typeHint: "number" }, // pat
    ],
    outputArgDefs: [],
    msxRequired: true,
    prependProjectHandle: false,
  },

  msxSetPatternValue: {
    wasmFunctionName: "_MSXsetpatternvalue",
    inputArgDefs: [
      { typeHint: "number" }, // pat
      { typeHint: "number" }, // period
      { typeHint: "number" }, // value
    ],
    outputArgDefs: [],
    msxRequired: true,
    prependProjectHandle: false,
  },

  msxSetPattern: {
    wasmFunctionName: "_MSXsetpattern",
    inputArgDefs: [
      { typeHint: "number" },   // pat
      { typeHint: "double[]" }, // mult (multiplier array)
      { typeHint: "length" },   // len (auto-calculated from mult)
    ],
    outputArgDefs: [],
    msxRequired: true,
    prependProjectHandle: false,
  },

  msxAddPattern: {
    wasmFunctionName: "_MSXaddpattern",
    inputArgDefs: [
      { typeHint: "string", isStringPtr: true }, // id
    ],
    outputArgDefs: [],
    msxRequired: true,
    prependProjectHandle: false,
  },

  // ... Define ALL other EPANET functions ...
};
