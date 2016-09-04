'use strict';
const xml2js = require('xml2js');

class Beans {
  constructor() {
    this.beanFactory = null;
  }

  init(xmlStr, cb) {
    this.beanFactory = null;
    cb = cb || ()=> {
      };
    xml2js.parseString(xmlStr, (err, json)=> {
      if (err) {
        return cb(err);
      }

      // ioc

      let beans;
      let singletons;
      try {
        beans = parseBeans(json);
        singletons = validateBeans(beans);
      } catch (e) {
        return cb(e);
      }
      let beansObj = {};
      for (let bean of beans) {
        beansObj[bean.id] = bean;
      }
      this.beanFactory = buildBeanFactory(beansObj, singletons);

      // aop
      let aops;
      try {
        aops = parseAops(json, this.beanFactory);
      } catch (e) {
        return cb(e);
      }

      buildAops(aops, this.beanFactory);

      cb(null);
    });
  }

  getBean(id) {
    return getFuncFromFactory(this.beanFactory, id)();
  }
}

module.exports = Beans;

class Bean {
  constructor(id, aClass, scope) {
    this.id = id;
    this.aClass = aClass;
    this.scope = scope;
    this.properties = [];
  }
}

class Property {
  constructor(name, value) {
    this.name = name;
    this.value = value;
  }
}

class Value {
  constructor(v, type) {
    this.v = v;
    this.type = type;
  }
}

class Aop {
  constructor(aopBean, advice) {
    this.aopBean = aopBean;
    this.advice = advice;
    this.refs = [];
  }
}

class AopRef {
  constructor(cut, ref, methods) {
    this.cut = cut;
    this.ref = ref;
    this.methods = methods;
  }
}

function parseBeans(json) {
  let beans = json['beans'] || [];
  if (!beans) {
    throw 'expecting element [beans]';
  }
  let result = [];

  let beanArray = beans['bean'] || [];
  let usedIds = [];
  for (let bean of beanArray) {
    parseBean(bean, usedIds, result);
  }

  return result;
}

function parseBean(bean, usedIds, result) {
  let attrs = bean['$'] || {};
  if (!attrs['id']) {
    throw 'expecting attribute node [id] when parsing bean';
  } else if (array(usedIds).contains(attrs['id'])) {
    throw 'duplicated id [' + attrs['id'] + ']';
  } else if (!attrs['class']) {
    throw 'expecting attribute node [class] when parsing bean(id=' + attrs['id'] + ')';
  } else if (attrs['scope']) {
    let scope = attrs['scope'];
    if (scope !== 'singleton' && scope !== 'prototype' && scope !== 'module') {
      throw 'unknown scope [' + scope + '], it can only be singleton or prototype or module';
    }
  }

  let id = attrs['id'];
  usedIds.push(id);
  let aClass = attrs['class'];
  let scope = attrs['scope'] || 'singleton';
  let beanObj = new Bean(id, aClass, scope);

  let propertyArray = bean['property'] || [];
  let usedNames = [];
  for (let property of propertyArray) {
    parseProperty(property, usedNames, beanObj);
  }
  result.push(beanObj);
}

function parseProperty(property, usedNames, beanObj) {
  let attrs = property['$'] || {};
  if (!attrs['name']) {
    throw `expecting attribute node [name] when parsing bean(id=${beanObj.id})`;
  } else if (array(usedNames).contains(attrs['name'])) {
    throw `duplicated property name [${attrs['name']}] when parsing bean(id=${beanObj.id})`;
  } else if (!conditionExpectingOne([
      !!attrs['ref'],
      !!attrs['value'],
      !!property['list'],
      !!property['ref'],
      !!property['value']
    ])) {
    throw `expecting [value] or [ref] or [list] when parsing property(name=${attrs['name']}) bean(id=${beanObj.id})`;
  }

  let name = attrs['name'];
  usedNames.push(name);
  let type = attrs['ref'] ? 'ref' : 'value';
  let v = attrs['ref'] || attrs['value'];
  if (!v) {
    let result = parseValue(property, beanObj.id, name);
    v = result.v;
    type = result.type;
  }
  let value = new Value(v, type);

  let propertyObj = new Property(name, value);
  beanObj.properties.push(propertyObj);
}

function conditionExpectingOne(conditions) {
  let result = false;
  for (let i = 0; i < conditions.length; ++i) {
    let condition = conditions[i];
    if (condition) {
      if (result) {
        return false;
      }
      result = true;
    }
  }
  return result;
}

function parseValue(property, beanId, propertyName) {
  if (property.hasOwnProperty('value')) {
    let v = property['value'][0];
    return {
      v: v,
      type: 'value'
    };
  } else if (property.hasOwnProperty('ref')) {
    let v = property['ref'][0];
    return {
      v: v,
      type: 'ref'
    };
  } else if (property.hasOwnProperty('list')) {
    let list = property['list'][0];
    if (!list['elem']) {
      throw `element [list] should have child element [elem] when parsing property(name=${propertyName}) of bean(id=${beanId})`;
    }
    list = list['elem'];
    let valueList = [];
    for (let elem of list) {
      let attrs = elem['$'] || {};
      if (!conditionExpectingOne([
          !!attrs['value'],
          !!attrs['ref']
        ])) {
        throw `expecting [value] or [ref] when parsing list in property(name=${propertyName}) of bean(id=${beanId})`;
      }
      let value = new Value(attrs['value'] || attrs['ref'], attrs['value'] ? 'value' : 'ref');
      valueList.push(value);
    }
    return {
      v: valueList,
      type: 'list'
    };
  }
}

// check module(class) exists
// check setter/field exists
// check ref exists
function validateBeans(beans) {
  let singletons = {};
  let beanIds = [];
  for (let bean of beans) {
    beanIds.push(bean.id);
  }

  for (let bean of beans) {
    let aClass = bean.aClass;
    let TheModule;
    // exists
    try {
      TheModule = require(getModuleRequirePath(aClass));
    } catch (e) {
      throw `failed to import module [${bean.aClass}] in bean(id=${bean.id}), got exception "${e}"`;
    }

    let instance;
    if (bean.scope === 'module') {
      instance = TheModule;
    } else {
      instance = new TheModule();
      if (bean.scope === 'singleton') {
        singletons[bean.id] = instance;
      }
    }

    for (let property of bean.properties) {
      let name = property.name;
      if (name.length < 1) {
        throw `invalid property name in bean(id=${bean.id})`;
      }
      let setterName = toSetterName(name);
      let setter = instance[setterName];
      if ((setter && (typeof setter) !== 'function') || (!setter && !instance.hasOwnProperty(name))) {
        throw `cannot find setter nor field by name [${name}] in bean(id=${bean.id})`;
      }

      validateValue(property.value, beanIds, bean.id, name);
    }
  }

  return singletons;
}

function validateValue(value, beanIds, currentBeanId, currentPropertyName) {
  if (value.type === 'ref') {
    let ref = value.v;
    if (!array(beanIds).contains(ref)) {
      throw `ref [${ref}] not found in property(name=${currentPropertyName}) of bean(id=${currentBeanId})`;
    }
  } else if (value.type === 'list') {
    let list = value.v;
    for (let v in list) {
      validateValue(v, beanIds, currentBeanId, currentPropertyName);
    }
  }
}

function getModuleRequirePath(aClass) {
  if (aClass.endsWith('.js')) {
    aClass = aClass.substring(0, aClass.length - '.js'.length);
  }
  return aClass;
}

function toSetterName(name) {
  return 'set' + name[0].toUpperCase() + name.substring(1);
}

function buildBeanFactory(beans, singletons) {
  let beanFactory = {};

  for (let key in singletons) {
    const singletonInstance = singletons[key];
    const useSetter = [];
    const useField = [];
    let isInstantiated = false;
    beanFactory[key] = ()=> {
      if (!isInstantiated) {
        handleInjections(singletonInstance, useSetter, useField);
        isInstantiated = true;
      }
      return singletonInstance;
    };
    extractSetterFieldConfig(beans[key], useSetter, useField, singletonInstance, beanFactory, beans);
  }

  for (let key in beans) {
    getFuncFromFactory(beanFactory, key, beans);
  }

  return beanFactory;
}

function getFuncFromFactory(factory, id, beans) {
  if (factory.hasOwnProperty(id)) {
    return factory[id];
  }

  let bean = beans[id];

  if (bean.scope === 'module') {
    const TheModule = require(getModuleRequirePath(bean.aClass));

    const useSetter = [];
    const useField = [];

    let isInstantiated = false;
    const func = ()=> {
      if (!isInstantiated) {
        handleInjections(TheModule, useSetter, useField);
        isInstantiated = true;
      }
      return TheModule;
    };

    factory[id] = func;
    extractSetterFieldConfig(bean, useSetter, useField, TheModule, factory, beans);
    return func;
  } else if (bean.scope === 'prototype') {
    const TheModule = require(getModuleRequirePath(bean.aClass));
    const sampleInstance = new TheModule();
    const useSetter = [];
    const useField = [];

    const func = ()=> {
      const instance = new TheModule();
      handleInjections(instance, useSetter, useField);
      return instance;
    };

    factory[id] = func;
    extractSetterFieldConfig(bean, useSetter, useField, sampleInstance, factory, beans);
    return func;
  }
}

function handleInjections(instance, useSetter, useField) {
  for (let config of useSetter) {
    instance[config.name](config.valueFunc());
  }
  for (let config of useField) {
    instance[config.name] = (config.valueFunc());
  }
}

function extractSetterFieldConfig(bean, useSetter, useField, instance, factory, beans) {
  for (let property of bean.properties) {
    let value = property.value;
    let valueFunc = extractValueFunc(value, factory, beans);

    let name = property.name;
    let setterName = toSetterName(name);

    if (instance[setterName] && (typeof instance[setterName]) === 'function') {
      useSetter.push({
        'name': setterName,
        'valueFunc': valueFunc
      });
    } else {
      useField.push({
        'name': name,
        'valueFunc': valueFunc
      });
    }
  }
}

function extractValueFunc(value, factory, beans) {
  if (value.type === 'ref') {
    return getFuncFromFactory(factory, value.v, beans);
  } else if (value.type === 'value') {
    return ()=> value.v;
  } else if (value.type === 'list') {
    const innerValueFuncs = [];
    for (let v of value.v) {
      innerValueFuncs.push(extractValueFunc(v, factory, beans));
    }
    return ()=> {
      const list = [];
      for (let func of innerValueFuncs) {
        list.push(func());
      }
      return list;
    };
  } else {
    throw '[error] code should not reach here: unknown value type ' + value.type;
  }
}

function parseAops(json, factory) {
  let beans = json['beans'] || [];
  if (!beans) {
    throw 'expecting element [beans]';
  }

  let aops = beans['aop'] || [];
  let aopObjArr = [];
  for (let aop of aops) {
    parseAop(aop, aopObjArr, factory);
  }

  return aopObjArr;
}

function parseAop(aop, aopObjArr, factory) {
  let attrs = aop['$'];
  if (!attrs) {
    throw `expecting attributes when parsing element [aop]`;
  }
  let bean = attrs['bean'];
  let advice = attrs['advice'];
  if (!bean) {
    throw `expecting attribute [bean] when parsing element [aop]`;
  } else if (!advice) {
    throw `expecting attribute [advice] when parsing element [aop]`;
  } else if (advice !== 'around' && advice !== 'before' && advice !== 'after') {
    throw `aop advice should be [around] or [before] or [after]`;
  } else if (!factory.hasOwnProperty(bean)) {
    throw `aop bean ${bean} does not exist`;
  }

  let aopInst = getFuncFromFactory(factory, bean)();
  if (!aopInst[advice] || (typeof aopInst[advice]) !== 'function') {
    throw `aop instance should have method ${advice}`;
  }

  let aopObj = new Aop(bean, advice);

  let refArray = aop['ref'] || [];
  for (let ref of refArray) {
    parseAopRef(ref, aopObj, factory);
  }

  aopObjArr.push(aopObj);
}

function parseAopRef(ref, aopObj, factory) {
  if ((typeof ref) === 'string') {
    if (!factory.hasOwnProperty(ref)) {
      throw `referenced bean [${ref}] does not exist`;
    }
    aopObj.refs.push(new AopRef('.*', ref, []));
  } else {
    let cut = ref['$']['cut'] || '.*';
    let r = ref['_'];
    if (!factory.hasOwnProperty(r)) {
      throw `referenced bean [${r}] does not exist`;
    }
    let methodsStr = ref['$']['methods'] || '';
    let methodArr = methodsStr.split('|');
    if (methodArr.length === 1 && methodArr[0] === '') {
      methodArr = [];
    }
    // validate
    let bean = getFuncFromFactory(factory, r)();
    for (let method of methodArr) {
      if (!bean[method] || (typeof bean[method]) !== 'function') {
        throw `cannot find method [${method}] in bean(id=${r})`;
      }
    }
    aopObj.refs.push(new AopRef(cut, r, methodArr));
  }
}

function buildAops(aops, factory) {
  for (let aop of aops) {
    let funcToGetAopObj = getFuncFromFactory(factory, aop.aopBean);
    let advice = aop.advice;
    for (let ref of aop.refs) {
      let funcToGetBean = getFuncFromFactory(factory, ref.ref);
      factory[ref.ref] = buildAop(advice, new RegExp(ref.cut), ref.methods, funcToGetAopObj, funcToGetBean);
    }
  }
}

function buildAop(advice, regex, methods, funcToGetAopObj, funcToGetBean) {
  let beanSample = funcToGetBean();
  const funcKeyRecorder = [];
  for (let k in beanSample) {
    let v = beanSample[k];
    if ((typeof v) === 'function') {
      funcKeyRecorder.push(k);
    }
  }
  for (let method of methods) {
    if (!array(funcKeyRecorder).contains(method)) {
      funcKeyRecorder.push(method);
    }
  }
  if (advice === 'before') {
    return ()=> {
      let bean = funcToGetBean();
      let aop = funcToGetAopObj();
      let proxy = {};
      for (let k of funcKeyRecorder) {
        if (!regex.test(k)) {
          proxy[k] = bean[k];
          continue;
        }
        proxy[k] = function() {
          // args
          let argLen = arguments.length;
          let args = [];
          for (let i = 0; i < argLen; ++i) {
            args.push(arguments[i]);
          }

          // build join point
          let joinPoint = new JoinPoint(args, k, bean, proxy);
          // invoke aop (before)
          aop[advice](joinPoint);
          // invoke real function
          joinPoint.invoke();
          return joinPoint.result;
        };
      }
      return proxy;
    };
  } else if (advice === 'after') {
    return ()=> {
      let bean = funcToGetBean();
      let aop = funcToGetAopObj();
      let proxy = {};
      for (let k of funcKeyRecorder) {
        if (!regex.test(k)) {
          proxy[k] = bean[k];
          continue;
        }
        proxy[k] = function() {
          // args
          let argLen = arguments.length;
          let args = [];
          for (let i = 0; i < argLen; ++i) {
            args.push(arguments[i]);
          }

          // build join point
          let joinPoint = new JoinPoint(args, k, bean, proxy);
          // invoke real function
          joinPoint.invoke();
          // invoke aop (after)
          aop[advice](joinPoint);
          return joinPoint.result;
        };
      }
      return proxy;
    };
  } else if (advice === 'around') {
    return ()=> {
      let bean = funcToGetBean();
      let aop = funcToGetAopObj();
      let proxy = {};
      for (let k of funcKeyRecorder) {
        if (!regex.test(k)) {
          proxy[k] = bean[k];
          continue;
        }
        proxy[k] = function() {
          // args
          let argLen = arguments.length;
          let args = [];
          for (let i = 0; i < argLen; ++i) {
            args.push(arguments[i]);
          }

          // build join point
          let joinPoint = new JoinPoint(args, k, bean, proxy);
          // invoke aop (around)
          aop[advice](joinPoint);
          return joinPoint.result;
        };
      }
      return proxy;
    };
  } else {
    throw `[error] code should not reach here: unknown advice ${advice}`;
  }
}

// utils
function array(arr) {
  return {
    'contains': (elem)=> {
      for (let e of arr) {
        if (e === elem) {
          return true;
        }
      }
      return false;
    }
  };
}

class JoinPoint {
  constructor(args, method, target, proxy) {
    this.args = args;
    this.method = method;
    this.target = target;
    this.proxy = proxy;
  }

  invoke() {
    let res = this.target[this.method].apply(this.target, this.args);
    this.result = res;
    return res;
  }
}
