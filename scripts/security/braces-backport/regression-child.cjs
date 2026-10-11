'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
assert.equal(Number(process.versions.node.split('.')[0]), 22);
assert.ok(path.isAbsolute(process.argv[2]));
const braces = require(process.argv[2]);
let assertions = 0;
const check = fn => { fn(); assertions++; };
const nested = (depth, kind = 'brace') => {
  const open = Array.from({ length: depth }, (_, i) => kind === 'brace' ? '{' : kind === 'paren' ? '(' : i % 2 ? '(' : '{');
  return open.join('') + 'a' + open.reverse().map(c => c === '{' ? '}' : ')').join('');
};
for (const api of ['parse', 'compile', 'expand', 'stringify']) {
  for (const kind of ['brace', 'paren', 'mixed']) {
    for (const depth of [99, 100]) check(() => assert.doesNotThrow(() => braces[api](nested(depth, kind))));
    for (const depth of [101, 4500]) check(() => assert.throws(() => braces[api](nested(depth, kind)), error => error instanceof SyntaxError && /exceeds max depth/.test(error.message)));
  }
  for (const maxDepth of [101, 3000, Infinity, NaN, '3000']) check(() => assert.throws(() => braces[api](nested(101), { maxDepth }), /exceeds max depth/));
  check(() => assert.throws(() => braces[api]('{{a}}', { maxDepth: 1 }), /exceeds max depth/));
  check(() => assert.doesNotThrow(() => braces[api]('x'.repeat(9001))));
  check(() => assert.doesNotThrow(() => braces[api]('"' + nested(101) + '"')));
}
for (const api of ['compile', 'expand', 'stringify']) {
  for (const depth of [101, 4500]) {
    let ast = { type: 'text', value: 'a' };
    for (let i = 0; i < depth; i++) { const parent = { type: 'paren', nodes: [ast] }; ast.parent = parent; ast = parent; }
    const root = { type: 'root', nodes: [ast] }; ast.parent = root;
    check(() => assert.throws(() => braces[api](root), error => error instanceof RangeError && /exceeds max depth/.test(error.message)));
  }
  const self = { type: 'root', nodes: [] }; self.nodes.push(self);
  check(() => assert.throws(() => braces[api](self), /exceeds max depth/));
  const first = { type: 'root', nodes: [] }; const second = { type: 'paren', parent: first, nodes: [first] }; first.nodes.push(second);
  check(() => assert.throws(() => braces[api](first), /exceeds max depth/));
}
for (const cycleSize of [1, 2]) {
  const child = { type: 'paren', nodes: [{ type: 'text', value: 'a' }] };
  child.parent = cycleSize === 1 ? child : { type: 'paren', parent: child };
  check(() => assert.throws(() => braces.expand({ type: 'root', nodes: [child] }), error => error instanceof RangeError && /parent chain contains a cycle/.test(error.message)));
}
check(() => assert.deepEqual(braces.expand('foo/({a,b})'), ['foo/(a)', 'foo/(b)']));
check(() => assert.deepEqual(braces.expand('file-{01..03}.js'), ['file-01.js', 'file-02.js', 'file-03.js']));
check(() => assert.equal(braces.compile('foo/{a,b}/bar'), 'foo/(a|b)/bar'));
check(() => assert.equal(braces.stringify('foo/{a,b}/bar'), 'foo/{a,b}/bar'));
check(() => assert.deepEqual(braces('foo/{a,b}/bar'), ['foo/(a|b)/bar']));
check(() => assert.deepEqual(braces('foo/{a,b}/bar', { expand: true }), ['foo/a/bar', 'foo/b/bar']));
check(() => assert.throws(() => braces(nested(4500)), /exceeds max depth/));
check(() => assert.throws(() => braces.create(nested(4500), { expand: true }), /exceeds max depth/));
for (const api of ['compile', 'stringify']) {
  const leaf = { type: 'text', value: 'a' };
  check(() => assert.equal(braces[api]({ type: 'root', nodes: [leaf, leaf] }), 'aa'));
}
process.stdout.write(JSON.stringify({ passed: true, assertions, nodeMajor: 22, module: process.argv[2] }) + '\n');
