import EpanetEngine from "@model-create/epanet-engine";

/** Configuration options for Workspace initialization */
export interface WorkspaceOptions {
  /**
   * Whether to use OPFS (Origin Private File System) for file storage.
   * When enabled, simulation output files (.bin, .hyd) are stored on disk
   * instead of in-memory, significantly reducing memory pressure for large
   * simulations.
   *
   * Requires:
   * - A browser with OPFS support (all modern browsers)
   * - SharedArrayBuffer support (requires COOP/COEP headers)
   * - Running in a secure context (HTTPS or localhost)
   *
   * Falls back to standard in-memory storage if OPFS is unavailable.
   *
   * @default false
   */
  useOPFS?: boolean;

  /**
   * The mount point for OPFS within the virtual filesystem.
   * Only used when useOPFS is true.
   * EPANET output files will be routed to this directory.
   *
   * @default "/opfs"
   */
  opfsMountPoint?: string;
}

export class Workspace {
  private _emscriptenModule: typeof EpanetEngine;
  private _instance: Awaited<ReturnType<typeof EpanetEngine>> | undefined;
  private _FS: Awaited<ReturnType<typeof EpanetEngine>>["FS"] | undefined;
  private _opfsEnabled: boolean = false;
  private _opfsMountPoint: string = "/opfs";
  private _options: WorkspaceOptions;

  constructor(options?: WorkspaceOptions) {
    this._options = options || {};
    this._opfsMountPoint = options?.opfsMountPoint || "/opfs";
    this._emscriptenModule = EpanetEngine;
  }

  async loadModule(): Promise<void> {
    let engine: Awaited<ReturnType<typeof EpanetEngine>>;

    if (this._options.useOPFS) {
      engine = await this._loadOPFSEngine();
    } else {
      engine = await this._emscriptenModule();
    }

    this._instance = engine;
    this._FS = engine.FS;

    // Mount OPFS if requested and available
    if (this._options.useOPFS) {
      this._opfsEnabled = await this._tryMountOPFS();
      if (!this._opfsEnabled) {
        console.warn(
          "epanet-js: OPFS requested but not available. " +
            "Falling back to in-memory storage. " +
            "Ensure the page is served with COOP/COEP headers for SharedArrayBuffer support.",
        );
      }
    }
  }

  /**
   * Dynamically import and instantiate the pthreads/WasmFS engine variant.
   * Falls back to the standard engine if the pthreads variant is not available.
   */
  private async _loadOPFSEngine(): Promise<
    Awaited<ReturnType<typeof EpanetEngine>>
  > {
    try {
      // Dynamic import of the pthreads variant
      const pthreadsModule = await import(
        // @ts-ignore - This path is resolved at runtime
        "@model-create/epanet-engine/pthreads"
      );
      const factory = pthreadsModule.default || pthreadsModule;
      return await factory();
    } catch (e) {
      console.warn(
        "epanet-js: Failed to load OPFS-enabled engine, falling back to standard engine:",
        e,
      );
      return await this._emscriptenModule();
    }
  }

  /**
   * Attempt to mount OPFS at the configured mount point.
   * Returns true if OPFS was successfully mounted, false otherwise.
   */
  private async _tryMountOPFS(): Promise<boolean> {
    if (!this._instance) return false;

    try {
      // Check if the pthreads build's OPFS helpers are available
      const supportsOpfs = (this._instance as any)._epanet_supports_opfs;
      const canMountOpfs = (this._instance as any)._epanet_can_mount_opfs;
      const mountOpfs = (this._instance as any)._epanet_mount_opfs;

      if (
        typeof supportsOpfs !== "function" ||
        typeof canMountOpfs !== "function" ||
        typeof mountOpfs !== "function"
      ) {
        // Not the pthreads build — OPFS functions not available
        return false;
      }

      // Check compile-time support
      if (!supportsOpfs()) {
        return false;
      }

      // Check runtime browser support
      if (!canMountOpfs()) {
        return false;
      }

      // Allocate string for mount path
      const EN = this._instance;
      const pathLen = EN.lengthBytesUTF8(this._opfsMountPoint) + 1;
      const pathPtr = EN._malloc(pathLen);
      EN.stringToUTF8(this._opfsMountPoint, pathPtr, pathLen);

      try {
        const result = mountOpfs(pathPtr);
        if (result === 0) {
          return true;
        } else {
          console.warn(
            `epanet-js: epanet_mount_opfs returned error code ${result}`,
          );
          return false;
        }
      } finally {
        EN._free(pathPtr);
      }
    } catch (e) {
      console.warn("epanet-js: Error mounting OPFS:", e);
      return false;
    }
  }

  /** Whether OPFS is currently enabled and mounted */
  get isOPFSEnabled(): boolean {
    return this._opfsEnabled;
  }

  /** The OPFS mount point path (e.g., "/opfs") */
  get opfsMountPoint(): string {
    return this._opfsMountPoint;
  }

  /**
   * Resolve a file path, routing it through OPFS if enabled.
   * Input files (.inp) are kept in the root (MEMFS) for fast access.
   * Output files (.rpt, .bin, .hyd) are routed to OPFS to save memory.
   *
   * @param path The original file path
   * @param forceMemfs If true, always use in-memory storage (for input files)
   * @returns The resolved path (potentially prefixed with OPFS mount point)
   */
  resolveFilePath(path: string, forceMemfs: boolean = false): string {
    if (!this._opfsEnabled || forceMemfs) {
      return path;
    }

    // Don't re-route paths that already point to OPFS
    if (path.startsWith(this._opfsMountPoint)) {
      return path;
    }

    // Route to OPFS mount point
    const filename = path.startsWith("/") ? path : "/" + path;
    return this._opfsMountPoint + filename;
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
}

export default Workspace;
