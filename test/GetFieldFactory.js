'use strict';

class GetFieldFactory {
  setRef(ref) {
    this.ref = ref;
  }

  setProperty(p) {
    this.property = p;
  }

  get() {
    return this.ref[this.property];
  }
}

module.exports = GetFieldFactory;
