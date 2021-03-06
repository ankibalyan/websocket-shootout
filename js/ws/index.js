'use strict';

var cluster = require('cluster');
var ws      = require('ws');

var wss = new ws.Server({
  perMessageDeflate: false,
  port: 3334
});

if (cluster.isWorker) {
  process.on('message', broadcastMessage);
}

function broadcastMessage(msg) {
  var buf = Buffer.from(msg);
  var opts = {binary: false};

  for (var i = 0; i < wss.clients.length; i++) {
    wss.clients[i].send(buf, opts);
  }
}

function echo(ws, payload) {
  ws.send(JSON.stringify({type: 'echo', payload: payload}));
}

function broadcast(ws, payload) {
  var msg = JSON.stringify({type: 'broadcast', payload: payload});

  if (cluster.isWorker) {
    process.send(msg);
  }
  broadcastMessage(msg);

  ws.send(JSON.stringify({type: 'broadcastResult', payload: payload}));
}

wss.on('connection', function connection(ws) {
  // uws removes the `upgradeReq` object right after emitting the `connection`
  // event. The same is also done here for parity.
  ws.upgradeReq = null;
  ws.on('message', function incoming(message) {
    var msg = JSON.parse(message);
    switch (msg.type) {
      case 'echo':
        echo(ws, msg.payload);
        break;
      case 'broadcast':
        broadcast(ws, msg.payload);
        break;
      default:
        console.log('unknown message type: %s', message);
    }
  });
});
