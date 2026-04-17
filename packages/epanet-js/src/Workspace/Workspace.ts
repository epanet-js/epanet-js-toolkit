import { Workspace as SlimWorkspace } from "./SlimWorkspace"
import epanetLts from "@epanet-js/epanet-engine";

export class Workspace extends SlimWorkspace {
  async loadModule(): Promise<void> {
    await super.loadModuleVersion(epanetLts);
  }
}

export default Workspace;
