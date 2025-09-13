// assumes test262 is checked out in ../test262

import fs from 'node:fs';
import vm from 'node:vm';

let testDir = '../test262/test/built-ins/Iterator';
let files = fs.readdirSync(testDir, { recursive: true });

let harness =
  fs.readFileSync('lib/index.js', 'utf8') +
[
  '../test262/harness/assert.js',
  '../test262/harness/propertyHelper.js',
  '../test262/harness/isConstructor.js',
  '../test262/harness/compareArray.js',
  '../test262/harness/testTypedArray.js',
  '../test262/harness/proxyTrapsHelper.js',
  '../test262/harness/wellKnownIntrinsicObjects.js',
].map(x => fs.readFileSync(x, 'utf8')).join('\n') + `
var $DETACHBUFFER = buff => buff.transfer();
class Test262Error extends Error {}
`;

for (let file of files) {
  if (!file.endsWith('.js')) continue;
  let basic = fs.readFileSync(testDir + '/' + file, 'utf8');
  if (!basic.includes('joint-iteration')) continue;
  console.log(testDir + '/' + file);
  let contents = harness + '\n(function(){ ' + basic + '})()';
  try {
    vm.runInContext(contents, vm.createContext({ console }));
  } catch (e) {
    fs.writeFileSync('evaluated-test262.js', contents, 'utf8');
    console.log('evaluated-test262.js')
    throw e;
  }
}
