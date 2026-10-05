/**
 * Root ESLint flat config.
 *
 * Uses a relative import (not `@auto-platform/config/...`) because with
 * `node-linker=hoisted` + `symlink=false`, workspace packages are not
 * present under `node_modules/@auto-platform/*` for Node ESM resolution.
 */
import base from "./packages/config/eslint/base.mjs";

/** @type {import("eslint").Linter.Config[]} */
export default [...base];
