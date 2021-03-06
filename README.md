# beans4js

650 lines. ioc and aspect context container for javascript on nodejs.

# Beans.js

## 依赖

Beans.js依赖于`xml2js`

## 使用

### 初始化

```js
let Beans = require('./Beans');
let beans = new Beans();
beans.init(xmlStr, err=> {
    // ...
});
```

其中回调可以省略。xmlStr可以用fs.readFileSync取到。

### 获取Bean

```js
let bean = beans.getBean('bean-id');
```

### AOP

```js
class TestAop {
    around(joinPoint) {
        // do something before invoking ...
        joinPoint.invoke();
        // do something after invoking ...
    }
    
    before(joinPoint) {
        // do something before inovking ...
    }
    
    after(joinPoint) {
        // do something after invoking ...
    }
}
```

其中joinPoint有如下字段

* args array 表示调用使用的参数。可以修改
* method string 调用的方法名。可以修改
* target object 实际对象。不建议修改
* proxy object 代理对象。不建议修改
* result object 调用返回结果。可以修改

__注意!!__ 上述3个方法的返回值均无效, 如要修改方法返回值请修改`joinPoint.result`字段。 

# applicationContext.xml

模仿Spring的配置进行设计。

```xml
<beans>
    <bean id="Bean的标志" scope="singleton(默认) | prototype | module" class="会在Beans.xml里直接require这个字符串">
        <property name="属性名1" value="常量"/>
        <property name="属性名2" ref="Bean标志"/>
        <property name="属性名3">
            <value>常量</value>
        </property>
        <property name="属性名4">
            <ref>Bean标志</ref>
        </property>
        <property name="属性名5">
            <list>
                <elem value="常量"/>
                <elem ref="Bean标志"/>
            </list>
        </property>
    </bean>
    <bean id="Bean的标志2" class="一个用了es6特性定义方法的js" methods="(默认为空字符串)doSomething|doAnotherThing">
    </bean>
    <bean id="Bean的标志3" factory="值规则同class,但不能在一个bean同时出现factory和class">
    </bean>

    <aspect bean="用于处理方法调用的bean" advice="around | before | after">
        <ref cut="需要代理的方法正则, 默认为.*">需要被代理的bean1</ref>
        <ref>需要被代理的bean2</ref>
    </aspect>
</beans>
```

其中`bean.id`唯一, 每个bean中`property.name`唯一

## 配置含义

### bean.id

bean的标志, 可以在`ref`属性或标签中使用, 相当于把这个bean注入到对应property中

### bean.scope

bean的实例化类型。

* singleton 表示这是个类, 并且在这个上下文中将只实例化一次。 也就是说它在这个上下文中是一个单例。
* prototype 表示这是个类, 在每次尝试获取时都会实例化一次。
* module 表示这是一个对象, 不会再进行实例化操作。

### bean.class

bean的实际对象, 这个值将在Beans.js中被直接require。

### bean.factory

表示这个bean是一个工厂bean, 每次取值时将调用该对象的get函数。  
一个bean不能同时定义class和factory

### bean.methods

由于es6的方法默认 `enumerable = false`, 所以无法遍历获取。如果需要对这个bean进行aop处理, 那么此处需要显式指定。用`|`分隔。  
当然, 也可以选择在 `constructor` 中手动绑定, 比如 `this.method = this.method.bind(this);`

### property.name

表示这个属性的名称。假设name设定为"xyz", 那么首先将寻找方法`setXyz`, 如果找不到, 那么将寻找字段`xyz`。  
如果需要通过字段注入, 那么不要设置setter, 并且在构造函数中写一句`this.xyz = null;`

### property.value

直接把这个字符串注入。

### property.ref

取出`bean.id === property.ref`的bean, 然后注入。

### property.list

注入一个列表。其中元素的值由`elem`规定。

### aspect.bean

表示处理方法时使用的bean。

如果这个bean是有状态的, 那么务必使用`scope="prototype"`。

### aspect.advice

表示该aspect的advice。advice支持3种

* before 在调用实际对象方法前触发
* after 在调用实际对象方法后触发
* around 前后均触发

### aspect.ref

表示需要被该aspect代理的bean。

### aspect.ref.cut

切入点, 是一个正则表达式, 只有匹配的方法名才会被代理。

# 其他

AOP的advice其实还有一种, exception。不过由于nodejs大部分是回调, 即使有异常也是回调处理的, 所以为了减少复杂度, 直接忽略了。

AOP还有一个功能叫introduction, 不过由于js是动态类型, 所以这个功能作用在此处实在很小。 想用的话直接在before步骤在proxy上加函数就行了。

# LICENSE

MIT LICENSE 2016 KuiGang Wang

## 缺陷

在aop模块有1处缺陷, 对于es6特性定义的类的方法无法遍历获取(这是es6特性, 没办法解决, 除非使用Proxies特性, 见下文), 也就无法进行织入  
因为es6的class中定义的方法并非`this.method = function(){}`, 无法通过`for(let k in o)`获取到。

而以往版本模拟的oop则不存在这个问题。

```js
// 对这种类实例化后的对象无法进行织入
class X {
    doSomething() {
        // ...
    }
}
// 这种正常
function X() {
    this.doSomething = function() {
        // ...
    };
}
// 这种也正常
var x = {};
x.prototype.doSomething = function() {
    // ...
}
```

暂时解决方案是: 在配置文件中指定所有包含的方法。或者手动在constructor中做bind，例如`this.method = this.method.bind(this);`。

上述es6的例子中, 使用`x['doSomething']`可以正常获取方法, 所以ioc模块的注入功能不受影响。

Proxies特性只有高版本node支持, 而且非LTS, 目前不考虑对其做特殊处理。后续高版本提供LTS再加上Proxies支持。
