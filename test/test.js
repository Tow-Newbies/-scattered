const assert = require('assert');
const Process = require('../process/Process.js');

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
		}, 1000)
	})
}

async function testAsync(val) {
	const result = await Promise.resolve(val + 10);
	return result;
}

describe('process', function () {
	const a = new Process();
	a.use(add);
	a.use(pow);
	a.use(promiseFn);
	a.use(testAsync);
	it(`should return 18 after 1s when initial input is 2`, (done) => {
	 a.start(2)
		.then(res=> {
		    assert.equal(res, 18, 'not the expected result');
		    done();
		})
		.catch(err=> {
			done(err);
		});
	})

})