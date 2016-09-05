var should = require('should');
var Beans = require('../Beans');

describe('test-aop', function() {
  it('around advice', function(done) {
    var beans = new Beans();
    beans.init(
      '<beans>' +
      '<aspect bean="aopAround" advice="around">' +
      '<ref>test1</ref>' +
      '</aspect>' +
      '<bean id="test1" class="./test/TestValueInjection"/>' +
      '<bean id="aopAround" class="./test/TestAop"/>' +
      '</beans>'
      , function(err) {
        should.not.exist(err);
        var test1 = beans.getBean('test1');
        should.equal(test1.doSomething(3), 8);
        done();
      }
    );
  });
  it('before advice', function(done) {
    var beans = new Beans();
    beans.init(
      '<beans>' +
      '<aspect bean="aopBefore" advice="before">' +
      '<ref>test1</ref>' +
      '</aspect>' +
      '<bean id="test1" class="./test/TestValueInjection"/>' +
      '<bean id="aopBefore" class="./test/TestAop"/>' +
      '</beans>'
      , function(err) {
        should.not.exist(err);
        var test1 = beans.getBean('test1');
        should.equal(test1.doSomething(3), 6);
        done();
      }
    );
  });
  it('after advice', function(done) {
    var beans = new Beans();
    beans.init(
      '<beans>' +
      '<aspect bean="aopAfter" advice="after">' +
      '<ref>test1</ref>' +
      '</aspect>' +
      '<bean id="test1" class="./test/TestValueInjection"/>' +
      '<bean id="aopAfter" class="./test/TestAop"/>' +
      '</beans>'
      , function(err) {
        should.not.exist(err);
        var test1 = beans.getBean('test1');
        should.equal(test1.doSomething(3), 7);
        done();
      }
    );
  });
  it('cut point', function(done) {
    var beans = new Beans();
    beans.init(
      '<beans>' +
      '<aspect bean="aopAround" advice="around">' +
      '<ref cut="doAnotherThing">test1</ref>' +
      '</aspect>' +
      '<bean id="test1" class="./test/TestValueInjection"/>' +
      '<bean id="aopAround" class="./test/TestAop"/>' +
      '</beans>'
      , function(err) {
        should.not.exist(err);
        var test1 = beans.getBean('test1');
        should.equal(test1.doSomething(3), 5);
        should.equal(test1.doAnotherThing(3), 8);
        done();
      }
    );
  });
  it('designate method', function(done) {
    var beans = new Beans();
    beans.init(
      '<beans>' +
      '<aspect bean="aopAround" advice="around">' +
      '<ref>test1</ref>' +
      '</aspect>' +
      '<bean id="test1" class="./test/TestValueInjection" methods="doXyz"/>' +
      '<bean id="aopAround" class="./test/TestAop"/>' +
      '</beans>'
      , function(err) {
        should.not.exist(err);
        var test1 = beans.getBean('test1');
        should.equal(test1.doSomething(3), 8);
        should.equal(test1.doAnotherThing(3), 8);
        should.equal(test1.doXyz(3), 8);
        done();
      }
    );
  });
  it('changes property', function(done) {
    var beans = new Beans();
    beans.init(
      '<beans>' +
      '<aspect bean="doNothing" advice="around">' +
      '<ref>test1</ref>' +
      '</aspect>' +
      '<bean id="test1" class="./test/TestChangeProperty"/>' +
      '<bean id="doNothing" class="./test/DoNothingAop"/>' +
      '</beans>'
      , function(err) {
        should.not.exist(err);
        var test1 = beans.getBean('test1');
        should.equal(test1.a, null);
        test1.a = 1;
        test1.invoke();
        should.equal(test1.a, 4);
        done();
      }
    );
  });
  it('injects aop object', function(done) {
    var beans = new Beans();
    beans.init(
      '<beans>' +
      '<aspect bean="doNothing" advice="around">' +
      '<ref>test1</ref>' +
      '</aspect>' +
      '<bean id="test1" class="./test/TestChangeProperty"/>' +
      '<bean id="doNothing" class="./test/DoNothingAop"/>' +
      '<bean id="test2" class="./test/TestValueInjection">' +
      '<property name="a" ref="test1"/>' +
      '</bean>' +
      '</beans>'
      , function(err) {
        should.not.exist(err);
        var test2 = beans.getBean('test2');
        var test1 = test2.a;
        should.equal(test1.a, null);
        test1.a = 1;
        test1.invoke();
        should.equal(test1.a, 4);
        done();
      }
    );
  });
});
