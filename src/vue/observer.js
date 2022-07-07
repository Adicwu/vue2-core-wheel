import {
	newArrPrototype
} from './arrHack.js'
import Dep from './dep.js'

class Observer {
	constructor(obj) {
		this.value = obj
		this.dep = new Dep()

		// 原型增加内容，方便数组hack内的内容绑定以及监听判断
		Object.defineProperty(obj, '__ob__', {
			value: this,
			enumerable: false // 设置不可枚举性，避免在处理对象时遍历造成的死循环
		})

		// 绑定
		if (Array.isArray(obj)) {
			obj.__proto__ = newArrPrototype
			this.walkArray(obj)
		} else {
			this.walk(obj)
		}
	}
	walk(obj) {
		// 外层对象监听
		Object.entries(obj).forEach(([k, v]) => defineReactive(this.value, k, v))
	}
	walkArray(arr) {
		arr.forEach(item => observer(item))
	}
}

export function observer(obj) {
	if (obj === null || typeof obj !== 'object') return;
	return obj.__ob__ instanceof Observer ? obj.__ob__ : new Observer(obj)
}

function dependArrChild(value) {
	value.forEach(cur => {
		cur.__ob__ && cur.__ob__.dep.depend()
		Array.isArray(cur) && dependArrChild(cur)
	})
}

function defineReactive(target, k, v) {
	let childOb = observer(v) // 内层对象监听，递归
	const dep = new Dep()
	Object.defineProperty(target, k, {
		configurable: true,
		enumerable: true,
		get() {
			// console.log('get', k);
			if (Dep.target) { // 配合Watcher中的run来运行
				dep.depend()
				if (childOb) { // 链式调用的关系，在其父中判断并订阅其子
					childOb.dep.depend()
					Array.isArray(v) && dependArrChild(v) // 递归遍历其后代
				}
			}
			return v
		},
		set(val) {
			// console.log('set', k, val);
			if (v !== val) {
				v = val
				observer(val);
				dep.notify();
			}
		},
	})
}
