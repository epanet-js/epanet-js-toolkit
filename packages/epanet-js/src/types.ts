import { EpanetEngine } from "@epanet-js/epanet-engine";

// Define memory types more strictly
export type EpanetMemoryType = "int" | "double" | "char" | "char-title";

// Mapping for JS return types
export interface MemoryTypes {
  int: number;
  double: number;
  char: string;
  "char-title": string;
}

// Define input argument description
export interface InputArgDef {
  // Type hint for potential validation or complex marshalling (optional)
  typeHint?:
    | "string"
    | "number"
    | "enum"
    | "boolean"
    | "double[]"
    | "length"
    | string;
  /** Set to true if this JS string argument needs conversion to a char* pointer */
  isStringPtr?: boolean;
  /** For length parameters, specifies which array parameter this length corresponds to */
  lengthFor?: string;
}

// Define output argument description
export interface OutputArgDef {
  /** The name of the output property in the returned object */
  name: string;
  /** The type of the output value */
  type: EpanetMemoryType;
}

// Define the structure for API function metadata
export interface ApiFunctionDefinition {
  /** The exact name exported by WASM (e.g., '_EN_getnodeindex') */
  wasmFunctionName: keyof EpanetEngine; // Allow string for flexibility

  /** Describes the INPUT arguments the JS function receives (excluding project handle) */
  inputArgDefs: InputArgDef[];

  /** List of output arguments with names and types */
  outputArgDefs: OutputArgDef[];

  /** Optional: Minimum EPANET version required */
  minVersion?: number;

  /** Optional: EPANET MSX support required */
  msxRequired?: boolean;

  /** Optional: preprends project handle? */
  prependProjectHandle?: boolean;

  /** Optional: Custom formatting for return values */
  postProcess?: (results: any[]) => any;

  arrayInputs?: {
    [key: string]: {
      type: "double";
      lengthParam: string;
    };
  };
}
