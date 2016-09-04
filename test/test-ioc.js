var should = require('should');
var Beans = require('../Beans');

describe('test-beans', function() {
  it('injects value', function(done) {
    var beans = new Beans();
    beans.init(
      '<beans>' +
      '<bean id="test1" class="./test/TestValueInjection">' +
      '<property name="a" value="1"/>' +
      '</bean>' +
      '</beans>'
      , function(err) {
        should.not.exist(err);
        var test1 = beans.getBean('test1');
        should.equal(test1.a, '1');
        done();
      });
  });
  it('injects value via setter', function(done) {
    var beans = new Beans();
    beans.init(
      '<beans>' +
      '<bean id="test1" class="./test/TestValueInjectionViaSetter">' +
      '<property name="a" value="1"/>' +
      '</bean>' +
      '</beans>'
      , function(err) {
        should.not.exist(err);
        var test1 = beans.getBean('test1');
        should.equal(test1.getA(), '1');
        done();
      }
    );
  });
  it('injects ref', function(done) {
    var beans = new Beans();
    beans.init(
      '<beans>' +
      '<bean id="test1" class="./test/TestValueInjection">' +
      '<property name="a" value="1"/>' +
      '</bean>' +
      '<bean id="test2" class="./test/TestRefInjection">' +
      '<property name="a" ref="test1"/>' +
      '<property name="b" value="2"/>' +
      '</bean>' +
      '</beans>'
      , function(err) {
        should.not.exist(err);
        var test2 = beans.getBean('test2');
        should.equal(test2.b, '2');
        should.equal(test2.getA().a, '1');
        done();
      }
    );
  });
  it('is a singleton', function(done) {
    var beans = new Beans();
    beans.init(
      '<beans>' +
      '<bean id="test1" class="./test/TestValueInjection" scope="singleton">' +
      '<property name="a" value="1"/>' +
      '</bean>' +
      '</beans>'
      , function(err) {
        should.not.exist(err);
        var test1_1 = beans.getBean('test1');
        var test1_2 = beans.getBean('test1');
        should.equal(test1_1, test1_2);

        should.equal(test1_1.a, '1');
        done();
      }
    );
  });
  it('is prototype', function(done) {
    var beans = new Beans();
    beans.init(
      '<beans>' +
      '<bean id="test1" class="./test/TestValueInjection" scope="prototype">' +
      '<property name="a" value="1"/>' +
      '</bean>' +
      '</beans>'
      , function(err) {
        should.not.exist(err);
        var test1_1 = beans.getBean('test1');
        var test1_2 = beans.getBean('test1');
        should.notEqual(test1_1, test1_2);

        should.equal(test1_1.a, '1');
        should.equal(test1_2.a, '1');
        done();
      }
    );
  });
  it('is a module', function(done) {
    var beans = new Beans();
    beans.init(
      '<beans>' +
      '<bean id="test1" class="./test/TestModule" scope="module">' +
      '<property name="a" value="1"/>' +
      '</bean>' +
      '</beans>'
      , function(err) {
        should.not.exist(err);
        var test1_1 = beans.getBean('test1');
        var test1_2 = beans.getBean('test1');
        should.equal(test1_1, test1_2);

        should.equal(test1_1.getA(), '1');
        done();
      }
    );
  });
  it('<value>...</value>', function(done) {
    var beans = new Beans();
    beans.init(
      '<beans>' +
      '<bean id="test1" class="./test/TestModule" scope="module">' +
      '<property name="a">' +
      '<value>1</value>' +
      '</property>' +
      '</bean>' +
      '</beans>'
      , function(err) {
        should.not.exist(err);
        var test1 = beans.getBean('test1');
        should.equal(test1.getA(), '1');
        done();
      }
    );
  });
  it('<ref>...</ref>', function(done) {
    var beans = new Beans();
    beans.init(
      '<beans>' +
      '<bean id="test1" class="./test/TestValueInjection">' +
      '<property name="a" value="1"/>' +
      '</bean>' +
      '<bean id="test2" class="./test/TestRefInjection">' +
      '<property name="a">' +
      '<ref>test1</ref>' +
      '</property>' +
      '</bean>' +
      '</beans>'
      , function(err) {
        should.not.exist(err);
        var test2 = beans.getBean('test2');
        should.equal(test2.getA().a, '1');
        var test1 = beans.getBean('test1');
        should.equal(test1, test2.getA());
        done();
      }
    );
  });
  it('injects list', function(done) {
    var beans = new Beans();
    beans.init(
      '<beans>' +
      ' <bean id="top" class="./test/TestModule" scope="module">' +
      '  <property name="a">' +
      '   <list>' +
      '    <elem value="1"></elem>' +
      '    <elem ref="test1"></elem>' +
      '   </list>' +
      '  </property>' +
      ' </bean>' +
      ' <bean id="test1" class="./test/TestValueInjection">' +
      '  <property name="a" value="1"/>' +
      ' </bean>' +
      '</beans>'
      , function(err) {
        should.not.exist(err);
        var top = beans.getBean('top');
        should.equal(top.getA()[0], '1');
        should.equal(top.getA()[1], beans.getBean('test1'));
        done();
      }
    );
  });
  it('circular dependencies', function(done) {
    var beans = new Beans();
    beans.init(
      '<beans>' +
      ' <bean id="test1" class="./test/Circular">' +
      '  <property name="value" ref="test2"/>' +
      ' </bean>' +
      ' <bean id="test2" class="./test/Circular">' +
      '  <property name="value" ref="test1"/>' +
      ' </bean>' +
      '</beans>'
      , function(err) {
        should.not.exist(err);
        var test1 = beans.getBean('test1');
        var test2 = beans.getBean('test2');
        should.equal(test1.value, test2);
        should.equal(test2.value, test1);
        should.equal(test1.value.value, test1);
        done();
      }
    );
  });
});
