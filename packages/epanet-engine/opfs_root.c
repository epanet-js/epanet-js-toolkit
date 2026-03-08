#include <emscripten.h>
#include <emscripten/threading.h>
#include <emscripten/wasmfs.h>

static int has_opfs_support(void) {
  return EM_ASM_INT({
    return typeof navigator !== 'undefined' &&
      typeof navigator.storage !== 'undefined' &&
      typeof navigator.storage.getDirectory === 'function';
  });
}

backend_t wasmfs_create_root_dir(void) {
  if (!has_opfs_support()) {
    return wasmfs_create_memory_backend();
  }

  if (emscripten_is_main_browser_thread() && emscripten_has_asyncify() != 2) {
    return wasmfs_create_memory_backend();
  }

  return wasmfs_create_opfs_backend();
}
