const WebSocketClient = require("websocket").client;
const request = require("request");

const address = process.env.ZERONET_CLIENT || "http://127.0.0.1:43110";

let masterAddress;

class ZeroFrame {
	constructor(connection) {
		this.connection = connection;
		this.nextMessageId = 1;
		this.waitingCallbacks = {};

		connection.on("message", message => {
			if(message.type === "utf8") {
				message = JSON.parse(message.utf8Data);
				if(message.cmd === "response") {
					if(this.waitingCallbacks[message.to]) {
						this.waitingCallbacks[message.to](message.result);
					}
				} else if(message.cmd === "ping") {
					this.send({
						cmd: "response",
						to: message.id,
						result: "pong"
					});
				}
			}
		});
	}

	send(message, callback) {
		message.id = this.nextMessageId++;
		this.connection.sendUTF(JSON.stringify(message));
		if(callback) {
			this.waitingCallbacks[message.id] = callback;
		}
	}

	cmd(cmd, params={}) {
		this.send({cmd, params});
	}
	async cmdp(cmd, params={}) {
		return await new Promise(resolve => {
			this.send({cmd, params}, resolve);
		});
	}
}


module.exports = async siteAddress => {
	return await new Promise((resolve, reject) => {
		// Get wrapper_key
		request({
			url: `${address}/${siteAddress}`,
			headers: {
				Accept: "text/html",
				"User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:67.0) Gecko/20100101 Firefox/67.0"
			}
		}, (e, res, body) => {
			if(e) {
				reject(e);
				return;
			}

			if(body.indexOf("Adding new sites disabled on this proxy") > -1) {
				reject(new Error("Adding new sites disabled on this proxy"));
				return;
			}

			for(const cookie of res.headers["set-cookie"]) {
				if(cookie.startsWith("master_address=")) {
					masterAddress = cookie.replace("master_address=", "").split(";")[0];
				}
			}

			const wrapperKey = body.split("wrapper_key = \"")[1].split("\"")[0];

			// Connect
			const client = new WebSocketClient();

			client.on("connectFailed", e => {
				reject(e);
			});

			client.on("connect", connection => {
				resolve(new ZeroFrame(connection));
			});

			client.connect(
				`${address.replace("http", "ws")}/ZeroNet-Internal/Websocket?wrapper_key=${wrapperKey}`,
				[],
				null,
				{
					Cookie: `master_address=${masterAddress}`
				}
			);
		});
	});
};