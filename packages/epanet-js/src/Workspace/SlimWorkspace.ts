import type { EpanetEngineAPI as EpanetEngine22 } from "@epanet-js/epanet-engine/v2.2";
import type { EpanetEngineAPI as EpanetEngine23 } from "@epanet-js/epanet-engine/v2.3";
import type { EpanetEngineAPI as EpanetEngine231 } from "@epanet-js/epanet-engine/v2.3.1";
import type { EpanetEngineAPI as EpanetEngine232 } from "@epanet-js/epanet-engine/v2.3.2";
import type { EpanetEngineAPI as EpanetEngine233 } from "@epanet-js/epanet-engine/v2.3.3";
import type { EpanetEngineAPI as EpanetEngine234 } from "@epanet-js/epanet-engine/v2.3.4";
import type { EpanetEngineAPI as EpanetEngine235 } from "@epanet-js/epanet-engine/v2.3.5";
import type { EpanetEngineAPI as EpanetEngine235LSX } from "@epanet-js/epanet-engine/v2.3.5-lsx";
import type { EpanetEngineAPI as EpanetEngineDev } from "@epanet-js/epanet-engine/dev";
import type { EpanetEngineAPI as EpanetEngineMaster } from "@epanet-js/epanet-engine/master";
import type { EpanetEngineAPI as EpanetEngine22MSX } from "@epanet-js/epanet-engine/v2.2-msx";
import type { EpanetEngineAPI as EpanetEngine23MSX } from "@epanet-js/epanet-engine/v2.3-msx";
import type { EpanetEngineAPI as EpanetEngine231MSX } from "@epanet-js/epanet-engine/v2.3.1-msx";
import type { EpanetEngineAPI as EpanetEngine232MSX } from "@epanet-js/epanet-engine/v2.3.2-msx";
import type { EpanetEngineAPI as EpanetEngine233MSX } from "@epanet-js/epanet-engine/v2.3.3-msx";
import type { EpanetEngineAPI as EpanetEngine234MSX } from "@epanet-js/epanet-engine/v2.3.4-msx";
import type { EpanetEngineAPI as EpanetEngine235MSX } from "@epanet-js/epanet-engine/v2.3.5-msx";
import type { EpanetEngineAPI as EpanetEngineDevMSX } from "@epanet-js/epanet-engine/dev-msx";
import type { EpanetEngineAPI as EpanetEngineMasterMSX } from "@epanet-js/epanet-engine/master-msx";

type EpanetEngine =
  EpanetEngine22 |
  EpanetEngine23 |
  EpanetEngine231 |
  EpanetEngine232 |
  EpanetEngine233 |
  EpanetEngine234 |
  EpanetEngine234 |
  EpanetEngine235 |
  EpanetEngine235LSX |
  EpanetEngineDev |
  EpanetEngineMaster |
  EpanetEngine22MSX |
  EpanetEngine23MSX |
  EpanetEngine231MSX |
  EpanetEngine232MSX |
  EpanetEngine233MSX |
  EpanetEngine234MSX |
  EpanetEngine235MSX |
  EpanetEngineDevMSX |
  EpanetEngineMasterMSX;

// Emscripten `addFunction` signature strings. 'v' = void, 'i' = int/pointer
// void (*)(void *userData, void *projectHandle, const char *line)
const REPORT_CALLBACK_SIGNATURE = "viii";
// void (*)(char *message)
const PROGRESS_CALLBACK_SIGNATURE = "vi";

const CALLBACK_SUPPORT_HINT =
  "The loaded EPANET engine was built without JavaScript callback support " +
  "(addFunction/removeFunction are missing). Rebuild @epanet-js/epanet-engine.";

export type ReportCallback = (line: string) => void;
export type ProgressCallback = (message: string) => void;

interface CallbackCapableEngine {
  addFunction?: (fn: (...args: number[]) => void, signature: string) => number;
  removeFunction?: (ptr: number) => void;
}

export class Workspace {
  private _instance: EpanetEngine | undefined;
  private _FS: EpanetEngine["FS"] | undefined;
  private _reportCallbackPtr: number | undefined;
  private _reportListeners = new Map<number, ReportCallback>();
  private _progressCallbackPtr: number | undefined;
  private _progressListener: ProgressCallback | undefined;

  async loadModuleVersion(epanetEngine: () => Promise<EpanetEngine>): Promise<void> {
    const engine = await epanetEngine();
    this._instance = engine;
    this._FS = engine.FS;
  }

  private checkEngineLoaded(): void {
    if (!this._instance) {
      throw new Error("EPANET engine not loaded. Call loadModule() first.");
    }
  }

  get isLoaded(): boolean {
    if (!this._instance) {
      return false;
    }
    return true;
  }

  get instance(): NonNullable<typeof this._instance> {
    this.checkEngineLoaded();
    return this._instance!;
  }

  private get FS(): NonNullable<typeof this._FS> {
    this.checkEngineLoaded();
    return this._FS!;
  }

  get version() {
    const intPointer = this.instance._malloc(4);
    this.instance._EN_getversion(intPointer);
    const returnValue = this.instance.getValue(intPointer, "i32");

    this.instance._free(intPointer);

    return returnValue;
  }

  getError(code: number) {
    const title1Ptr = this.instance._malloc(256); //EN_MAXMSG
    this.instance._EN_geterror(code, title1Ptr, 256);
    const errMessage = this.instance.UTF8ToString(title1Ptr);
    this.instance._free(title1Ptr);
    return errMessage;
  }

  writeFile(path: string, data: string | Uint8Array) {
    this.FS.writeFile(path, data);
  }

  readFile(file: string): string;
  readFile(file: string, encoding: "utf8"): string;
  readFile(file: string, encoding: "binary"): Uint8Array;
  readFile(file: any, encoding?: "utf8" | "binary"): any {
    if (!encoding || encoding === "utf8") {
      encoding = "utf8";
      return this.FS.readFile(file, {
        encoding,
      }) as string;
    }
    return this.FS.readFile(file, {
      encoding,
    }) as Uint8Array;
  }

  get supportsCallbacks(): boolean {
    const engine = this.instance as unknown as CallbackCapableEngine;
    return typeof engine.addFunction === "function";
  }

  private _addFunction(
    fn: (...args: number[]) => void,
    signature: string,
  ): number {
    const engine = this.instance as unknown as CallbackCapableEngine;
    if (typeof engine.addFunction !== "function") {
      throw new Error(CALLBACK_SUPPORT_HINT);
    }
    return engine.addFunction(fn, signature);
  }

  _getReportCallbackPtr(): number {
    if (this._reportCallbackPtr === undefined) {
      const engine = this.instance;
      this._reportCallbackPtr = this._addFunction(
        (_userData: number, projectHandle: number, linePtr: number) => {
          const listener = this._reportListeners.get(projectHandle);
          if (listener) listener(engine.UTF8ToString(linePtr));
        },
        REPORT_CALLBACK_SIGNATURE,
      );
    }
    return this._reportCallbackPtr;
  }

  _setReportListener(
    projectHandle: number,
    listener: ReportCallback | null,
  ): void {
    if (listener) {
      this._reportListeners.set(projectHandle, listener);
    } else {
      this._reportListeners.delete(projectHandle);
    }
  }

  _getProgressCallbackPtr(): number {
    if (this._progressCallbackPtr === undefined) {
      const engine = this.instance;
      this._progressCallbackPtr = this._addFunction((messagePtr: number) => {
        if (this._progressListener) {
          this._progressListener(engine.UTF8ToString(messagePtr));
        }
      }, PROGRESS_CALLBACK_SIGNATURE);
    }
    return this._progressCallbackPtr;
  }

  _withProgressListener<T>(listener: ProgressCallback, fn: () => T): T {
    const previous = this._progressListener;
    this._progressListener = listener;
    try {
      return fn();
    } finally {
      this._progressListener = previous;
    }
  }
}

export default Workspace;
