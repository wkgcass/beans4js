'use strict';

var test = module.exports;

var a;
test.setA = (_a)=> {
  a = _a;
};
test.getA = ()=> {
  return a;
};
test.p = 'hello';
test.q = 'world';
