import {
	observer
} from './observer'
import Watcher, {
	nextTick
} from './watcher'
import {
	compileToFunction
} from "./compiler/index";
import {
	mountComponent,
	initLifeCycle
} from "./lifecycle";
import Dep from './dep'

function defineComputed(target, k, def) {
	const setter = typeof def === 'function' ? (() => {}) : def.set
	Object.defineProperty(target, k, {
		get: createComputedGetter.bind(target, k),
		set: setter,
	})
}

function createComputedGetter(key) {
	const wat = this._computedWatchers[key]
	if (wat.dirty) {
		wat.eval()
	}
	if (Dep.target) { // 计算属性出栈后 还要渲染watcher， 我应该让计算属性watcher里面的属性 也去收集上一层watcher
		wat.depend();
	}
	return wat.value
}

class Vue {
	constructor(op) {
		this.$options = op
		this.initData()
		this.initComputed()
	}

	initData() {
		// data实例值获取
		let data = this.$options.data
		data = typeof data === 'function' ? data() : data

		// 实例初始化操作
		this._data = data

		// 代理
		observer(data)
		Object.keys(data).forEach(k => this._proxy(k, '_data'))
	}

	initComputed() {
		// debugger;
		const watchers = this._computedWatchers = {}

		Object.entries(this.$options.computed || {}).forEach(([k, v]) => {
			const getter = typeof v === 'function' ? v : v.get;
			watchers[k] = new Watcher(this, getter, {
				lazy: true
			})
			defineComputed(this, k, v)
		})
	}

	// data代理到vue实例
	_proxy(key, type) {
		Object.defineProperty(this, key, {
			configurable: true,
			enumerable: true,
			get: () => this[type][key],
			set: val => {
				this[type][key] = val;
			},
		});
	}

}

Vue.prototype.$nextTick = nextTick
// 下列所有内容关乎视图渲染，暂时没学
Vue.prototype.$mount = function(elName) {
	const el = this.$el = document.querySelector(elName)

	// const render = () => {
	// 	// this.age
	// 	this.$el.innerHTML = JSON.stringify(this.test)
	// 	// this.$el.innerHTML = JSON.stringify(this.test)
	// 	// this.$el.innerHTML = JSON.stringify(this.test)
	// }
	// this._watcher = new Watcher(this, render)
	// return this

	const vm = this;
	let ops = vm.$options
	if (!ops.render) { // 先进行查找有没有render函数 
		let template; // 没有render看一下是否写了tempate, 没写template采用外部的template
		if (!ops.template && el) { // 没有写模板 但是写了el
			template = el.outerHTML
		} else {
			if (el) {
				template = ops.template // 如果有el 则采用模板的内容
			}
		}
		// 写了temlate 就用 写了的template
		if (template && el) {
			// 这里需要对模板进行编译 
			const render = compileToFunction(template);
			ops.render = render; // jsx 最终会被编译成h('xxx')
		}
	}
	mountComponent(vm, el); // 组件的挂载  
	// 最终就可以获取render方法
	// script 标签引用的vue.global.js 这个编译过程是在浏览器运行的
	// runtime是不包含模板编译的, 整个编译是打包的时候通过loader来转义.vue文件的, 用runtime的时候不能使用template
	return this
}
initLifeCycle(Vue)

export default Vue
