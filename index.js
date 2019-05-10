const core = require('biot-core');
const eventBus = require('ocore/event_bus');
const ChannelsManager = require('biot-core/lib/ChannelsManager');

const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);

server.listen(9999);

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html');
});

app.get('/imgs/:name', (req, res) => {
	res.sendFile(__dirname + '/imgs/' + req.params.name);
});


app.get('/qrcode.min.js', (req, res) => {
	res.sendFile(__dirname + '/qrcode.min.js');
});

let sockets = {};

io.on('connection', (socket) => {
	sockets[socket.id] = socket;
	console.error('id', socket.id);
	
	socket.on('disconnect', () => {
		delete sockets[socket.id];
	});
});

(async () => {
	await core.init('test');
	let wallets = await core.getMyDeviceWallets();
	const timeout = 20000; // 20 sec
	
	const channelsManager = new ChannelsManager(wallets[0], timeout);
	
	channelsManager.events.on('newChannel', async (objInfo) => {
		let socketId = objInfo.messageOnOpening;
		
		let channel = channelsManager.getNewChannel(objInfo);
		channel.events.on('error', error => {
			console.error('channelError', channel.id, error);
		});
		channel.events.on('start', () => {
			
			if (sockets[socketId]) sockets[socketId].emit('channel_opened');
			
			console.error('channel start:', channel.id);
		});
		channel.events.on('changed_step', (step) => {
			
			if (step === 'mutualClose') {
				if (sockets[socketId]) sockets[socketId].emit('channel_closed');
			}
			
			console.error('changed_step: ', step);
		});
		channel.events.on('new_transfer', async (amount) => {
			console.error('new_transfer', amount, channel);
			
			if (sockets[socketId]) sockets[socketId].emit('channel_transfer', channel.myAmount, channel.peerAmount);
		});
		await channel.init();
		if (channel.myAmount === 1 && channel.peerAmount === 161) {
			try {
				await channel.approve();
				
			}catch (e) {
				console.error('qwerqwer', e);
			}
		} else {
			await channel.reject();
		}
	});
	
	
	eventBus.on('paired', (from_address) => {
	
	});
	
	eventBus.on('text', async (from_address, object) => {
	
	});
	
})().catch(console.error);
