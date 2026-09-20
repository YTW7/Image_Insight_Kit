// lib/tfjs-polyfill.ts
import util from "util";
if (!(util as any).isNullOrUndefined) {
  (util as any).isNullOrUndefined = (val: unknown) => val === null || val === undefined;
}