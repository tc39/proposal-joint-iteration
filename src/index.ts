declare var Iterator: {};

if (typeof Iterator === 'undefined' || Iterator == null) {
  globalThis.Iterator = {};
}

const zip = (a: any) => {
  return a;
};

Object.defineProperty(Iterator, 'zip', {
  configurable: true,
  writable: true,
  enumerable: false,
  value: zip,
});