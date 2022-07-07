import Dep, {
	pushTarget,
	popTarget
} from './dep'

let id = 0
export default class Watcher {
	constructor(vm, fn, op = {
		lazy: false
	}, cb) {
		this.id = id++
		this.getter = fn.bind(vm)
		this.deps = []
		this.depsId = new Set()
		this.lazy = this.dirty = op.lazy;
		this.value = this.lazy ? undefined : this.get()
	}
	eval() {
		this.value = this.get()
		this.dirty = false
	}
	depend() { // watcher的depend 就是让watcher中dep去depend
		let i = this.deps.length;
		while (i--) {
			this.deps[i].depend(); // 让计算属性watcher 也收集渲染watcher
		}
	}
	get() {
		pushTarget(this) // 将当前watcher挂载到Dep的全局target上
		const value = this.getter() // 由于在执行render时会涉及到vm.data值的get，也就会触发监听，故方便get中存入当前watcher
		popTarget() // 执行完成 放空
		return value
	}
	// 此方法与Dep的addSub、depend是为了避免相同的watcher被放入同一个dep
	addDep(dep) {
		const depId = dep.id
		if (this.depsId.has(depId)) return;
		this.depsId.add(depId)
		this.deps.push(dep)
		dep.addSub(this)
	}
	update() {
		if (this.lazy) {
			// 如果是计算属性  依赖的值变化了 就标识计算属性是脏值了
			this.dirty = true;
		} else {
			queueWatcher(this); // 把当前的watcher 暂存起来
		}
	}
	run() {
		const oldV = this.value,
			newV = this.get()
	}
}

/**
 * 数据异步更新队列，用于去重与一次性更新
 */
const queue = []
let has = {}
let pending = false

function flushSchQueue() {
	const qu = queue.slice(0) // 浅拷贝赋值要执行的watcher队列
	queue.splice(0)
	has = {}
	pending = false
	qu.forEach(q => q.run())
}

function queueWatcher(watcher) {
	if (!has[watcher.id]) {
		has[watcher.id] = true
		queue.push(watcher)
		if (!pending) {
			nextTick(flushSchQueue, true)
			pending = true
		}
	}
}

/**
 * nextTick原理
 */
const callbacks = []
let waiting = false

function flushCallbacks() {
	const qu = callbacks.slice(0) // 浅拷贝赋值要执行的watcher队列
	callbacks.splice(0)
	waiting = false
	qu.forEach(q => q())
}

export function nextTick(cb, before = false) {
	before ? callbacks.unshift(cb) : callbacks.push(cb)
	if (!waiting) {
		setTimeout(flushCallbacks, 0)
		waiting = true
	}
}
