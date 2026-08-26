import pkg from "../../package.json";

/** App semver from package.json — bump there, then tag `v{version}`. */
export const APP_VERSION = pkg.version;
export const APP_VERSION_LABEL = `v${pkg.version}`;
