### 响应式原理

1. 初始化`vue`，判断`data`格式，并使用`Object.defineProperty`将其代理到原型
2. 创建`Observer`观察者，利用循环递归遍历`data`的每一个属性，并对每一个属性使用`Object.defineProperty`进行`set/get`拦截

### 数组响应

> 由于数组存在的`'push', 'pop', 'unshift', 'splice', 'shift', 'reverse'`的几个api，会操作数组，增加会删除其子项，而这种情况下的子项无法通过Object.defineProperty拦截，故需要单独处理

1. 拷贝一份数组的原型链`Array.prototype`，并将其原型上的指定api进行hack，针对部分产生的新值进行`Observer`观察。最后将其给被观察者的原型`__proto__`上
2. 在`Observer`执行时区分对象与数组的观察方法，并对被观察的属性原型增加`__ob__`属性（注意，此属性需要设置不可枚举，不然会连其一起遍历观察了），值为当前的`Observer`，便于在对数组api进行hack中能调用其`Observer`，并对其新值进行观察
3. 注意，上面的步骤只解决了数组新增属性与数组自身的监听，并没有实现数组内部属性的监听。同样的，为`Observer`创建一个私有`Dep`（取名为dep），用于其后续增加的属性触发对应的更新；由于属性是链式的调用，所以在某个属性上新增属性时，必然会触发其父属性的get，故在其父属性的`Observer中的get`中新加对子属性`dep`的判断，并让其执行depend（如果需要处理子属性的后代，则需要再使用递归遍历一次其后代）；在被hack的数组原型方法上，触发其属性的`dep.notify`进行视图更新
4. 做完上续操作后，我们仍然不能动态增加属性，如`aa.b = 1`或`aa[0] = 1`，其仍然不会触发视图更新；vue官方的做法是提供了`$set`方法，其原理就是在修改后触发一次其父属性的notify，如上面举例的` aa.__ob__.dep.notify()`

### 依赖收集

1. 新增`Watcher`，其主要为了处理`render`函数的`data`属性依赖（所以其实例化时需要传入当前vue实例与render函数），以及对应的重新渲染
2. 新增`Dep`，并定义其全局变量`Dep.target`（用于存放临时Watcher），采用发布订阅模式，用于管理多个`watcher`
3. `Watcher\Dep\Observer` 联动。首先，`Observer` 在`vue`实例化时已将`data`全部遍历观察，后续为组件绑定节点时($mount)，会将实例化一个`Watcher`(也就是组件渲染watcher)，然后将其自身（Watcher）放置到`Dep.target`上，然后执行`render`（由于render中会涉及到data属性的使用，所以也就理所当然的触发了Observer中的get，执行完成后放空`Dep.target`；期间，`Observer中的get`执行`dep.depend`，此方法会通过`Dep.target`执行`Watcher`上的`addDep`方法（此方法又会调用当前dep上的addSub方法，将当前Watcher放入dep，于是就建立了一个 渲染watcher上有所有data属性的dep 与 所有属性的dep都有一个渲染watcher 的链接关系）；最后，当`Observer中的set`触发，进行新值监听与并触发对应的`render`执行（调用dep.notify，让当前dep中的watcher全部执行其get）

> 异步更新。上续操作的最后一步我们提到，dep.notify会一股脑执行所有watcher的get方法，相当于变一个data属性就会执行一次更新，比较浪费性能。实际上，vue使用了防抖的原理，将要执行get的watcher放入了一个队列，并将其 去重、延后，最终实现统一更新

由于上一步`异步更新`的实现，导致在更改值后立即获取节点的值使用点，会取到旧值。于是定义了一个api叫`$nextTick`，其同样利用了`异步更新`的原理，使用队列与防抖来 将其`获取节点的操作`与`要执行get的watcher队列`放入一个队伍，等待watcher队列执行完成之后，再执行`获取节点的操作`

值得一提的是，`$nextTick`的异步操作由于兼容性的问题，采用了优雅降级的模式，使用`Promise-es6`、`MutationObserver-h5`、`setImmediate-ie`、`setTimeout-全环境`来实现

### 计算属性

1. 像收集`data`一样，`computed`同样需要我们收集，但不同的是，`data`被一个`watcher`统一管理着，而一个计算属性就对应了一个`Watcher`
2. 在`vue实例`上定义一个私有全局属性`_computedWatchers`，用于存放每一个`computed`的`watcher`，而`watcher`的`render`参数，在此刻就相当于`computed属性的get`；同样的，使用`Object.defineProperty`将具体的`computed属性`代理到`vue实例`，并进行`get/set`拦截，在`get`中获取其`computed属性`对应的`watcher`，并判断是否`dirty`选择性执行计算，并在成功计算后设置`dirty=true`，最后将`computed属性的watcher`与渲染`watcher`进行关联（`watcher.depend()`）
3. 和上面的依赖收集一样，我们在使用`computed属性时`，会触发其对应的`get`；而在`get`中，我们又使用了属于他自己的`watcher`执行了`eval`(watcher.get的变种，增加了ditry处理与当前值的赋予)，让当前的`全局Dep`变成了此时的`computed属性`；由于我们执行了`eavl`，就导致其内部使用的`data`中的属性触发了自己的`get`(Object.defineProperty拦截的get)，于是乎，对应的`data属性`又与此时的`computed属性`建立了`dep`与`watcher`的关联，就像上面说的一样；所以，在我们改变`computed属性`所依赖的`data属性`时，也就会触发视图更新

> 脏值判断。我们为watcher增加了dirty与lazy属性，而lazy属性正好让我们区分当前watcher是否为computed的watcher（lazy为true时）；所以我们可以在每次执行watcher.getter（相当于computed属性的get）时定义为非脏值，执行watcher.update（每次属性变动后通知更新时会触发）时定义为脏值

***.computed的渲染watcher关联**

假设我们有以下结构

```javascript
...
<h1>{{ test }}</h1>
...

const aa = new Vue({
  data() {
    return {
      age: 18,
    }
  },
  computed: {
    test: {
      get() {
        return this.age + '~' 
      }
    }
  }
}).$mount('#app')
setTimeout(() => {
  aa.age = 22
}, 1000)
```

那么我们的初始化流程如下：

1. vue实例化创建，data的age属性挂载并`observer依赖监听`，computed的test属性进行`独立监听并`生成其`私有watcher`
2. render函数创建完毕，生成render的私有watcher，并执行`render函数`；由于`render函数`中使用到了computed的test，故触发其独立监听，并进行第一次`test.getter`；此时我们触发`Dep.target队列`更新，将render的watcher临时放置到`Dep.target队列`以及Dep的全局
3. 由于`test.getter`触发，其`Dep.target队列末尾`更新为`test的watcher`（render的watcher被移到了前面）；然后涉及到了age的使用，所以又调用了`age的observer依赖监听`，此时age检查到`test的watcher`为全局内容，于是与其建立`dep与watcher的关联`；最终，`test.getter`执行完成，然后将`Dep.target的队列末尾`去除，并取到`上一个watcher`，也就是render
4. 然后render函数的`watcher.get`执行完毕，将`Dep.target的队列末尾`去除（此后为空状态）

可以看出，age成功收集到了`test的watcher`，所以我们在更改`aa.age`时，就会触发其`test的watcher.get`。但是，age并没有收集到`render的watcher`，就导致了`视图不会更新`；所以我们在`test.getter执行时`、`test的watcher.get执行后`（因为执行后全局的watcher被去除一次，就剩下了一开始的render），让`test的watcher`进行一次`deps`（在这里只有`age的dep`）遍历，并在遍历时让每一个dep去收集当前的`全局watcher（render）`

​	