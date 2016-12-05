import {getQueueableRequest} from './queue-utils';
import {broadcastMessage} from './broadcast-manager';
import {
	broadcastMessageAddedType,
	broadcastMessageFailedType,
	defaultQueueName,
	tagNamePrefix,
	allQueuesPlaceholder,
} from './constants';
import assert from '../../../../lib/assert';

let _requestCounter = 0;
let _queueCounter = 0;
/**
 * Core queue class that handles all the enqueue and dequeue
 * as well as cleanup code for the background sync queue
 * @class
 */
class RequestQueue {
	/**
	 * Creates an instance of Queue.
	 *
	 * @memberOf Queue
	 */
	constructor({
		config,
		queueName = defaultQueueName + '_' + _queueCounter++,
		idbQDb,
	}) {
		this._isQueueNameAddedToAllQueue = false;
		this._queueName = queueName;
		this._config = config;
		this._idbQDb = idbQDb;
		this._queue = [];
		this.initQueue();
	}

	async initQueue() {
		const idbQueue = await this._idbQDb.get(this._queueName);
		this._queue.concat(idbQueue);
	}

	async addQueueNameToAllQueues() {
		if(!this._isQueueNameAddedToAllQueue) {
			let allQueues = await this._idbQDb.get(allQueuesPlaceholder);
			allQueues = allQueues || [];
			if(!allQueues.includes(this._queueName)) {
				allQueues.push(this._queueName);
			}
			this._idbQDb.put(allQueuesPlaceholder, allQueues);
			this._isQueueNameAddedToAllQueue = true;
		}
	}

	async saveQueue() {
		await this._idbQDb.put(this._queueName, this._queue);
	}

	/**
	 * push any request to background sync queue which would be played later
	 * preferably when network comes back
	 *
	 * @param {Request} request request object to be queued by this
	 * @param {Object} config optional config to override config params
	 *
	 * @memberOf Queue
	 */
	async push({request}) {
		assert.isInstance({request}, Request);

		const hash = `${request.url}!${Date.now()}!${_requestCounter++}`;
		const queuableRequest =
			await getQueueableRequest({
				request,
				config: this._config,
			});
		try{
			this._queue.push(hash);

			// add to queue
			this.saveQueue();
			this._idbQDb.put(hash, queuableRequest);
			this.addQueueNameToAllQueues();
			// register sync
			self.registration.sync.register(tagNamePrefix + this._queueName);

			// broadcast the success of request added to the queue
			broadcastMessage({
				type: broadcastMessageAddedType,
				id: hash,
				url: request.url,
			});
		} catch(e) {
			// broadcast the failure of request added to the queue
			broadcastMessage({
				type: broadcastMessageFailedType,
				id: hash,
				url: request.url,
			});
		}
	}

	/**
	 * get the Request from the queue at a particular index
	 *
	 * @param {string} hash hash of the request at the given index
	 * @return {Request}
	 *
	 * @memberOf Queue
	 */
	async getRequestFromQueue({hash}) {
		assert.isType({hash}, 'string');

		if(this._queue.includes(hash)) {
			return await this._idbQDb.get(hash);
		}
	}

	get queue() {
		return Object.assign([], this._queue);
	}

	get queueName() {
		return this._queueName;
	}

	get idbQDb() {
		return this._idbQDb;
	}
}

export default RequestQueue;
