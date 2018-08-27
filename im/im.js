// const _ ;
// const IO = ()=> {};
const noop = () => {};

const IdOnTime = () => {
    return Date.now();
};


const SUCCESS = 'success';
const FAIL = 'fail';

const TimeoutDelay = 10 * 1000;
class Base {
    constructor({
        server = '',
        onMessage = noop,
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
        };
    }

    // socket = null

    /**
     * 链接
     */

    connect(connectConfig = {}) {
        const {
            server,
            onMessage,
            onConnect,
            onDisconnect,
            onReconnect,
            onError,
        } = this.config;

        console.log(server, 'server')

        const socket = io(server, { ...connectConfig });

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('message', onMessage);
        socket.on('reconnect', onReconnect);
        socket.on('error', onError);

        this.socket = socket;
        // return socket;
    }

    emit(...args) {
        return this.socket.emit(...args);
    }

    on(evt, callback) {
        return this.socket.on(evt, callback);
    }

}


// 实现基本的逻辑，主要处理msg 的发送，以及发送状态的变更、通知
class Struct extends Base {
    constructor(initials) {
        super(initials);

        // 实例存储，用于处理一些需要记录的数据
        this.localPool = {
            msgSentQueue: [],
            // msgFailed: [],
            msgQuequeMap: {},
        };
    }



    decorateMsg(msg) {
        return {
            origin: _.cloneDeep(msg),
            isFailed: false,
            isPosting: true,
            id: msg.id,
            timestamp: Date.now(),
        };
    }

    /**
     * 发送前，先预存消息，用于判断消息发送成功或者失败
     * 在 TimeoutDelay 时限内没有收到 回执，则认为发送失败
     */

    beforePost(msg) {
        const _msg = this.decorateMsg(msg);

        new Promise((resolve, reject) => {
                this.localPool.msgSentQueue.push(_msg);
                this.localPool.msgQuequeMap[_msg.id] = {
                    id: _msg.id,
                    idx: this.localPool.msgSentQueue.length - 1,
                    origin: _.cloneDeep(_msg),
                    promise: {
                        resolve,
                        reject,
                    },
                };

                setTimeout(() => {
                    reject(_msg);
                }, TimeoutDelay);
            })
            .then((res) => {
                this.resolveAfterPost('success', res);
            }, (rej) => {
                this.resolveAfterPost('fail', rej);
            })
            .catch((e) => {
                const m = this.localPool.msgQuequeMap[_msg.id];
                if (m && m.promise && m.promise.reject) {
                    m.promise.reject(_msg);
                }
            });

        return _msg;
    }

    /** emit 方法 */
    postMessage(msg) {
        this.emit('message', JSON.stringify(msg));
    }

    send(msg) {
        this.beforePost(msg);
        this.postMessage(msg);
    }

    /** 消息发送成功收到回执 或者 发送失败后统一处理, 无论成功还是失败，均从 发送队列【msgSentQueue】 中删除 */
    resolveAfterPost(type = SUCCESS, msg) {
        const { onResult } = this.config;
        const { msgSentQueue, msgQuequeMap } = this.localPool;
        const target = _.cloneDeep(msgQuequeMap[msg.id]);
        target.origin.isPosting = false;

        if (type === SUCCESS) {
            console.log('post success and received ack');
            // post success and received ack
        } else {
            target.origin.isFailed = true;
        }

        const newMsgSentQueue = [
            ...(msgSentQueue.slice(0, target.idx) || []),
            ...(msgSentQueue.slice(target.idx + 1) || []),
        ];

        delete msgQuequeMap[msg.id];

        this.localPool = {
            ...this.localPool,
            msgSentQueue: [...newMsgSentQueue],
            msgQuequeMap,
        };
        // 如果订阅有结果通知，那么调用通知外部
        onResult(target, type);
    }


}

// model 层，数据的变化
class Model {
    constructor() {
        this.resetPool();
    }

    updateQueue() {

    }

    updateMap() {

    }

    updatePool() {

    }

    resetPool() {
        this.pool = {
            msgSentQueue: [],
            msgQuequeMap: {},
        };
    }

    getPool() {

    }
}

// 临时的数据缓存
const tempMessageArr = [];
let count = 10;



var curUser = {};

// 实例运用
class Ins {
    constructor(config) {
        this.im = new Struct({
            server: config.server,
            onConnect: this.onConnect.bind(this),
            onDisconnect: this.onDisconnect.bind(this),
            onReconnect: this.onReconnect.bind(this),
            onError: this.onError.bind(this),
            onResult: this.onResult.bind(this),
            onMessage: this.onMessage.bind(this),
        });

        this.pool = {
            msgArr: [],
            msgGroup: {},
            msgIdxMap: {},
        };
    }

    onConnect() {
        console.log('connected success.');
        // this.asyncMessage();
    }

    onDisconnect() {
        console.log('disconnected.');
    }

    onReconnect() {
        console.log('reconnected.');
    }

    onError() {
        console.log('errors');
    }

    onResult(msg, type) {
        const { msgIdxMap, msgGroup } = this.pool;
        // const key = `0_1000@1/0_1001@1`;
        const key = this.getKey();

        console.log('msg sent callback', msg, type);

        let m = msgGroup[key][msgIdxMap[msg.id]]
        m = { ...m, isPosting: false, seq: msg.origin.seq, isFailed: msg.origin.isFailed };
        msgGroup[key][msgIdxMap[msg.id]] = m;
        // this.updatePool({ msgGroup })
        console.log(this);
        new Promise(resolve => {
                setTimeout(() => {
                    resolve()
                }, ~~(Math.random() * 1000))
            })
            .then(res => {
                genList();
            })
    }

    onMessage(msg) {
        const self = this;
        const { msgIdxMap, msgGroup } = this.pool;
        const msgObj = JSON.parse(msg);
        console.log('receive messages', msgObj);
        const { type, seq, id, data = {} } = msgObj;
        // const key = `0_1000@1/0_1001@1`;
        const key = this.getKey();
        // console.log(this.im.localPool);
        // 某个消息的回执的情况
        if (type === 1 && seq !== undefined) {
            const _msg = this.im.localPool.msgQuequeMap[id];
            if (_msg) {
                _msg.origin.seq = seq;
                _msg.promise.resolve(_msg.origin); // 这个应该放在Struct 里面实现，但是由于这个系统～～，所以～～
            }
        }

        if (type === 3 || type === 6) {
            // 直接是一条消息发送过来了
            if (!data.messages) {
                this.resolveMessage([msgObj]);
                return;
            }
            tempMessageArr.push(...data.messages);
            if (data.availableCount && data.availableCount > 0) {
                this.asyncMessage((tempMessageArr.slice(-1)[0] || { seq: 0 }).seq);
                return;
            }
            this.resolveMessage(tempMessageArr);
            tempMessageArr.length = 0;
        }

        if (type === 4 && msgObj.noticeType === 0) {
            this.asyncMessage();
            return;
        }

    }

    // 同步消息
    asyncMessage(offset) {
        count--;
        console.log('asyncMessage', count, offset);



        const { msgGroup, msgArr } = this.pool;

        const getSeqLatest = (msgArr, len) => {
            if (!msgArr.length) {
                return 0;
            }
            const _len = len || msgArr.length;
            if (msgArr[_len - 1].seq) {
                return msgArr[_len - 1].seq;
            }
            if (len !== undefined && len < 1) {
                return 0;
            }
            return getSeqLatest(msgArr, _len - 1);
        };


        const _msg = {
            offset,
            id: IdOnTime(),
            type: 5,
            maxCount: 100,
        }
        const _offset = offset === undefined ? getSeqLatest(msgArr) || 0 : offset;
        console.log('_offset', _offset)


        this.im.send({
            ..._msg,
            offset: _offset
        })
    }

    // 更新pool;
    updatePool({ msgArr, msgGroup, updatePool }) {
        if (msgArr) {
            this.pool.msgArr = msgArr;
        }
        if (msgGroup) {
            this.pool.msgGroup = msgGroup;
        }
        if (updatePool) {
            this.pool.updatePool = updatePool;
        }
    }

    // 消息接收处理
    // 根据type 的不同，进行不同的处理
    resolveMessage(msgs = []) {
        const { msgGroup, msgArr } = this.pool;
        const isReconnect = false;

        const newMsgGroup = _.cloneDeep(msgGroup);
        msgs.map((msg) => {
            const { from, to } = msg;
            const _from = from.replace(/\/.*$/g, '');
            const fn = isReconnect ? _.sortedUniqBy : _.uniqBy;
            const group = from.indexOf(curUser.jid) > -1 ? `${to}/${_from}` : `${_from}/${to}`;
            newMsgGroup[group] = fn([...(newMsgGroup[group] || []), msg], 'id');
        });
        msgArr.push(...msgs);

        this.updatePool({ msgArr, msgGroup: newMsgGroup });

        this.sendAck(msgs);
        console.log(this);
        genList();
    }

    sendAck(msgs = []) {
        const last = msgs[msgs.length - 1];
        this.im.send({
            id: last.id,
            to: last.actualFrom,
            type: 1,
        })
    }

    // 回执处理
    resolveACK(msg) {
        const _msg = {
            offset,
            id: IdOnTime(),
            type: 5,
            maxCount: 100,
        }
        const _offset = offset === undefined ? getSeqLatest(msgArr) || 0 : offset;
        console.log('_offset', _offset)


        this.im.send({
            ..._msg,
            offset: _offset
        })
    }

    init(config = {}) {
        this.im.connect(config);
    }

    sendMessage(msg) {
        const _msg = {
            // from: `${curUser.jid}`,
            id: IdOnTime(),
            type: 3,
            to: this.toUser,
            data: msg,
            req: 1,
        }

        const { msgArr, msgGroup, msgIdxMap } = this.pool;
        const key = this.getKey();
        console.log('key =====> >>> ', key)
        msgArr.push(_msg);
        if (msgGroup[key] && msgGroup[key].length) {
            msgGroup[key] = [...msgGroup[key], { ..._msg, isPosting: true }]
        } else {
            msgGroup[key] = [{ ..._msg, isPosting: true }];
        }
        //msgGroup[key] = [...(msgGroup[key] || []), { ..._msg, isPosting: true}];
        msgIdxMap[_msg.id] = msgGroup[key].length - 1;
        this.updatePool({ msgArr, msgGroup, msgIdxMap });

        this.im.send(_msg);
        genList();
        // console.log(JSON.stringify(this.pool));
    }

    setToUser(toJid) {
        this.toUser = toJid;
    }

    getKey() {
        return `${this.toUser}/${curUser.jid}`;
    }
}

// 

