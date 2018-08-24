const assert = require('assert');
const Process = require('./Process.js');

function add(a) {
	return a + 1;
}

function pow(a){
	return a ** 2;
}

function promiseFn(val) {
	return new Promise(resolve => {
		setTimeout(() => {
			resolve(val -1);
		}, ~~(Math.random() * 1000))
	})
}

descript('process', function () {
	const a = new Process();
	a.use(add);
	a.use(pow);
	a.use('promiseFn');
	it('should return 3', (done) => {
		a.start(1)
		.then(res=> {
			done(res);
		})
		.catch(err=> {
			done(err);
		});
	})

})