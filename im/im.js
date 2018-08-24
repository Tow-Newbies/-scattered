const _ ;
const IO = ()=> {};
const noop = () => {};

const SUCCESS = 'success';
const FAIL = 'fail';

const TimeoutDelay = 10 * 1000;
class IM {
	constructor({
		server = '',
		onMessage =  noop,
		onConnect = noop,
		onDisconnect = noop,
		onReconnect = noop,
		onError = noop,
		onResult = noop,
	}) {
		this.config = {
			server,
			onMessage,
			onConnect,
			onDisconnect,
			onReconnect,
			onError,
			onResult,
		}
	}

	socket = null

	/**
	 * 链接	
	 */

	connect = (connectConfig)=> {
		const socket = io(server, {...connectConfig});
		const {
			server,
			onMessage,
			onConnect,
			onDisconnect,
			onReconnect,
			onError,
		} = this.config;

		socket.on('connect', onConnect);
		socket.on('disconnect', onDisconnect);
		socket.on('message', onMessage);
		socket.on('reconnect', onReconnect);
		socket.on('error', onError);

		this.socket = socket;
		return socket;
	}

	emit(...args){
		return this.socket.emit(...args)
	}

}

class IMInstan extends IM {

	// 实例存储，用于处理一些需要记录的数据
	localPool = {
		msgSentQueue: [],
		// msgFailed: [],
		msgQuequeMap: {},
	};

	decorateMsg = (msg) => {
		return {
			origin: _.cloneDeep(msg),
			isFailed: false,
			isPosting: true,
			id: msg.id,
			timestamp: Date.now(),
		}
	}

	/**
	 * 发送前，先预存消息，用于判断消息发送成功或者失败
	 * 在 TimeoutDelay 时限内没有收到 回执，则认为发送失败
	 */

	beforePost = (msg) => {
		const _msg = this.decorateMsg(msg);

		new Promise((resolve, reject) => {

			this.localPool.msgSentQueue.push(_msg);
			this.localPool.msgQuequeMap[_msg.id] = {
				idx: this.localPool.length - 1, 
				promise: {
					resolve,
					reject,
				},
			};

			setTimeout(() => {
				reject(_msg);
			}, TimeoutDelay)
		})
		.then(res=> {
			this.resolveAfterPost('success', res);
		}, rej => {
			this.resolveAfterPost('fail', rej);
		})
		.catch(e => {
			this.localPool.msgQuequeMap[_msg.id].promise.reject(_msg);
		})
		;

		return _msg;
	}

	/** emit 方法 */
	postMessage = (msg) => {
		this.emit('message', JSON.stringify(msg));
	}

	/** 消息发送成功收到回执 或者 发送失败后统一处理, 无论成功还是失败，均从 发送队列【msgSentQueue】 中删除 */
	resolveAfterPost = (type = SUCCESS, msg) => {
		const { onResult } = this.config;
		const { msgSentQueue, msgQuequeMap } = this.localPool;
		const target = _.cloneDeep(msgQuequeMap[msg.id]);
		if(type === SUCCESS){
			target.isPosting = false;
		}else{
			target.isFailed = true;
		}

		const newMsgSentQueue = [
			...(msgSentQueue.slice(0, target.idx) || []),
			...(msgSentQueue.slice(target.idx + 1) || [])
		];

		delete msgQuequeMap[msg.id];

		this.localPool = {
			...this.localPool,
			msgSentQueue: [...newMsgSentQueue],
			msgQuequeMap,
		}
		// 如果订阅有结果通知，那么调用通知外部
		onResult(target, type);
	}


}