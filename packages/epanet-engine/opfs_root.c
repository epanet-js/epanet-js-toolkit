#include <emscripten.h>
#include <errno.h>
#include <emscripten/threading.h>
#include <emscripten/wasmfs.h>

static backend_t opfs_backend = 0;

static int has_opfs_support(void) {
  return EM_ASM_INT({
    return typeof navigator !== 'undefined' &&
      typeof navigator.storage !== 'undefined' &&
      typeof navigator.storage.getDirectory === 'function';
  });
}

int epanet_supports_opfs(void) {
  return has_opfs_support();
}

int epanet_can_mount_opfs(void) {
  if (!has_opfs_support()) {
    return 0;
  }

#ifndef __EMSCRIPTEN_PTHREADS__
  if (emscripten_has_asyncify() != 2) {
    return 0;
  }
#endif

  if (emscripten_is_main_browser_thread() && emscripten_has_asyncify() != 2) {
    return 0;
  }

  return 1;
}

int epanet_mount_opfs(const char* path) {
  if (!path) {
    return -EINVAL;
  }

  if (!epanet_can_mount_opfs()) {
    return -ENOTSUP;
  }

  if (!opfs_backend) {
    opfs_backend = wasmfs_create_opfs_backend();
    if (!opfs_backend) {
      return -EIO;
    }
  }

  int result = wasmfs_create_directory(path, 0777, opfs_backend);
  if (result == -EEXIST) {
    return 0;
  }

  return result;
}
