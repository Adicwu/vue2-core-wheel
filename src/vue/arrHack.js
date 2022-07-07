// 数组hack
export const newArrPrototype = (() => {
	const oldArrPrototype = Array.prototype
	const newArrPrototype = Object.create(oldArrPrototype);
	['push', 'pop', 'unshift', 'splice', 'shift', 'reverse'].forEach(fnName => {
		newArrPrototype[fnName] = function(...args) {
			const res = oldArrPrototype[fnName].call(this, ...args)

			// 额为新增的内容增加绑定
			let cb
			switch (fnName) {
				case 'push':
				case 'unshift': {
					cb = args
					break;
				}
				case 'splice': {
					cb = args.slice(2)
				}
			}
			cb && this.__ob__.walkArray(cb)
			this.__ob__.dep.notify() // 触发视图更新
			
			return res
		}
	})
	return newArrPrototype
})()
