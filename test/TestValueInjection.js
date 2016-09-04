'use strict';
class Test1 {
  constructor() {
    this.a = null;
  }

  doXyz(a) {
    return x(a);
  }
}

function x(a) {
  return a + 2;
}

Test1.prototype.doSomething = a=> x(a);
Test1.prototype.doAnotherThing = a=> x(a);

module.exports = Test1;
