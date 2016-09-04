'use strict';
class TestChangeProperty {
  constructor() {
    this.a = null;
    this.invoke = this.invoke.bind(this);
  }

  invoke() {
    this.a += 3;
  }
}

module.exports = TestChangeProperty;
