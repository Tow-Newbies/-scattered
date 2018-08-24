class Process {
  constructor() {
    this.middleWare = [];
    this.cache = [];
  }
 // fn 必须是同步， 异步须转换成promise 或同步化
  use(fn) {
    this.middleWare.push(fn);
  }

  async next(val) {
    const fn = this.cache.shift();
    const nextVal = await fn(val);
    if (this.cache.length) {
      return this.next(nextVal) || val;
    }
    return nextVal || val;
  }

  start(val) {
    this.cache = [...this.middleWare];
    return new Promise((resolve) => {
      const result = this.next(val);
      resolve(result);
    });
  }

}

// export default Process;
module.exports = Process;
