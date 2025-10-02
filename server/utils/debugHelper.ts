export const dbg = (...args: any[]) => {
  if (process.env.DEBUG_GEO === "1") console.log(...args);
};