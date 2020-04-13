const PORT = process.env.PORT || 3000;

var express = require('express');

var app = express();
var server = app.listen(PORT);

app.use(express.static('dist'));

console.log("Server running");

var socket = require('socket.io');

var io = socket(server);

// Define drawing
let art = {};

// Define users
let users = {}


io.sockets.on('connection', newConnection);

function newConnection(socket) {
    // Log new connection in console
    console.log("New user: " + socket.id);
    
    // Send art and userdata to new user
    io.sockets.emit('art', art); //TODO don't broadcast to everyone
    io.sockets.emit('userData', users);

    // Add new user to users
    users[socket.id] = {};

    // Save username and tell clients to update username list
    socket.on('username', (name) => {
        users[socket.id]["name"] = name;

        // Send user data
        io.sockets.emit('userData', users);
        io.sockets.emit('updateUsernameList', {});
    });

    // User changed color. Tell clients to update
    socket.on('colorChange', (color) => {
        users[socket.id]["color"] = color;

        // Send user data
        io.sockets.emit('userData', users);
        io.sockets.emit('updateUsernameList', {});
    });

    // Handle client data
    socket.on('clientData', handleClientData);

    function handleClientData(data) {
        // Update user position
        if (data.loc) {
            if (typeof users[data.id] === 'undefined') {
                users[data.id] = {};
            }
            users[data.id]["loc"] = data.loc;
                users[data.id]["color"] = data.color;
        }

        // Send user data
        io.sockets.emit('userData', users);

        if (data.isPainting) {
            paint(data.loc, data.color)
        }

    }

    function paint(loc, color) {
        if (typeof art[loc.x] === 'undefined') {
            art[loc.x] = {}
            art[loc.x][loc.y] = color;
            io.sockets.emit('art', art);
        } else if (typeof art[loc.x][loc.y] === 'undefined') {
            art[loc.x][loc.y] = color;
            io.sockets.emit('art', art);
        }
    }

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log("Lost user: " + socket.id);
        delete users[socket.id];

        // Send user data
        io.sockets.emit('userData', users);
        io.sockets.emit('updateUsernameList', {});
    });
}