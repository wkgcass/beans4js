'use strict';
class DoNothingAop {
  around(joinPoint) {
    joinPoint.invoke();
  }
}

module.exports = DoNothingAop;
