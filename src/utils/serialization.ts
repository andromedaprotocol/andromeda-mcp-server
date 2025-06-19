// Polyfill BigInt serialization for JSON.stringify
// This is necessary because JSON.stringify does not natively support BigInt.
// It converts BigInt values to strings before serialization.
export const setupBigIntSerialization = () => {
  (BigInt.prototype as any).toJSON = function () { return this.toString(); };
};

// Safe BigInt stringification utility
export const safeBigIntStringify = (obj: any): string => {
  return JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
};