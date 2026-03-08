/**
 * wasmfs_opfs.c - OPFS (Origin Private File System) integration for EPANET WASM
 *
 * Provides functions to mount OPFS as a WasmFS backend directory,
 * allowing large simulation output files (.bin, .hyd) to be stored
 * on disk instead of in-memory, reducing browser memory pressure.
 *
 * Requires compilation with: -sWASMFS -pthread -lopfs.js
 */

#include <emscripten.h>
#include <emscripten/wasmfs.h>
#include <sys/stat.h>
#include <stdio.h>
#include <string.h>
#include <errno.h>

/**
 * Check if this build was compiled with OPFS support.
 * Always returns 1 for the pthreads/WasmFS build.
 * The standard MEMFS build does not include this file.
 *
 * @return 1 if OPFS support is compiled in
 */
EMSCRIPTEN_KEEPALIVE
int epanet_supports_opfs(void) {
    return 1;
}

/**
 * Check at runtime whether the browser environment supports OPFS.
 * Uses EM_ASM to test for navigator.storage.getDirectory().
 *
 * @return 1 if OPFS is available, 0 otherwise
 */
EMSCRIPTEN_KEEPALIVE
int epanet_can_mount_opfs(void) {
    return EM_ASM_INT({
        return (typeof navigator !== 'undefined' &&
                typeof navigator.storage !== 'undefined' &&
                typeof navigator.storage.getDirectory === 'function') ? 1 : 0;
    });
}

/**
 * Mount OPFS at the specified path using WasmFS OPFS backend.
 *
 * Creates the OPFS backend via wasmfs_create_opfs_backend(),
 * then creates a directory and mounts it at the given path.
 *
 * @param mount_path The filesystem path to mount OPFS at (e.g., "/opfs")
 * @return 0 on success, -1 on failure
 */
EMSCRIPTEN_KEEPALIVE
int epanet_mount_opfs(const char* mount_path) {
    if (!mount_path || strlen(mount_path) == 0) {
        fprintf(stderr, "epanet_mount_opfs: invalid mount path\n");
        return -1;
    }

    /* Create the OPFS backend */
    backend_t opfs_backend = wasmfs_create_opfs_backend();
    if (opfs_backend < 0) {
        fprintf(stderr, "epanet_mount_opfs: failed to create OPFS backend\n");
        return -1;
    }

    /* Create the mount directory */
    int result = wasmfs_create_directory(mount_path, 0777, opfs_backend);
    if (result != 0) {
        fprintf(stderr, "epanet_mount_opfs: failed to create directory '%s' (errno=%d)\n",
                mount_path, errno);
        return -1;
    }

    return 0;
}
