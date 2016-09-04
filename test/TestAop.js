'use strict';
class TestAop {
  around(joinPoint) {
    joinPoint.args[0] += 1;
    joinPoint.invoke();
    joinPoint.result += 2;
  }

  before(joinPoint) {
    joinPoint.args[0] += 1;
  }

  after(joinPoint) {
    joinPoint.result += 2;
  }
}

module.exports = TestAop;
