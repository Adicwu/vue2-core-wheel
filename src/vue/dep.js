let id = 0
export default class Dep {
	constructor() {
		this.id = id++
		this.subs = []
	}
	depend() {
		Dep.target.addDep(this)
	}
	addSub(wa) {
		this.subs.push(wa)
	}
	notify() {
		// 通知所有的订阅者(Watcher)，触发订阅者的相应逻辑处理
		// debugger
		this.subs.forEach(wa => wa.update());
	}
}
Dep.target = null;
const stack = []
export function pushTarget(wa) {
	stack.push(wa)
	Dep.target = wa
}
export function popTarget() {
	stack.pop()
	Dep.target = stack[stack.length - 1]
}
