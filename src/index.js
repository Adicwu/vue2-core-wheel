import Vue from "./vue/index";

const aa = new Vue({
  data() {
    return {
      // author: 'adic',
      age: 18,
      // list: [1, 2]
    }
  },
  computed: {
    test: {
      get() {
        // debugger;
        console.log('test get');
        // return this.author + '--' + this.age
        return this.age
        // + '--' + this.list.join('~')
      },
      // set(val) {
      //   console.log(this, val, 'set');
      //   this.age = val
      // }
    }
  },
  watch: {
    age(newV, oldV) {
      console.log('AGE CHANGE', newV, oldV);
    }
  }
}).$mount('#app')
console.log('ready', aa)
setTimeout(() => {
  // aa.list.push(3)
  aa.age = 22
  // aa.test = 23
  // console.log('end', aa);
  // setTimeout(() => {
  //   aa.test = 33
  // }, 2000)
}, 1000)
setTimeout(() => {
  aa.age = 23
}, 2000)

// aa.list[1] = 2
// console.log(aa);
// setTimeout(() => {
// 	aa.author = 'lucy'
// 	aa.age = 20
// 	aa.author = 'bob'
// 	aa.age = 30
// }, 1100)
// aa.author = 'lucy'
// aa.$nextTick(() => {
// 	console.log(document.querySelector('#app').innerHTML);
// })

// https://www.bilibili.com/video/BV1mR4y1w7cU?p=14&spm_id_from=pageDriver&vd_source=c5594576f1a683147cded7c857af2b39
