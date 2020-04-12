import p5 from "p5/lib/p5.min";
import io from "socket.io-client";

import '@polymer/paper-swatch-picker/paper-swatch-picker.js';
 

// Game initialization
let scale = 50;
let translate = {x: 100, y: 100};

let lastRightClick = {};
let isPanning = false;
let pan = {x: 0, y: 0};

let art = {};
let users = {};

let brushEnabled = false;
let isPainting = false;
let color = '#1976d2';

const debug = true;

// Websocket setup
// const socket = io('http://localhost:3000');
const socket = io(window.location.hostname);
socket.on('connect', onConnect);

// Log new socket connection
function onConnect(){
    console.log('Socket connection id ' + socket.id);
}

// Receive art and update local version
socket.on('art', updateArt);

function updateArt(a) {
    art = a;
} 

// Receive user data and update local version
socket.on('userData', handleUserdata);

function handleUserdata(u) {
    users = u;
}

// Update usernamelist
socket.on('updateUsernameList', updateUsernameList);

function updateUsernameList() {
    let playersList = $( "#playerList" );
    playersList.empty();

    for (let player in users) {
        playersList.append(`<div><p>${users[player]["name"]}</p></div>`)
    }
}

/////////////////
// Landing screen
document.getElementById("name-submission-field").addEventListener("keypress", function(e){
    if (e.key === 'Enter') {
        captureName();
    }
});

document.getElementById("name-submission-button").addEventListener("keypress", function(e){
    if (e.key === 'Enter') {
        captureName();
    }
});

function captureName() {
    const name = document.getElementById("name-submission-field").value
    if (name.length > 2) {
        socket.emit("username", name);
        const container = document.getElementById("login-container");
        container.classList.add("hidden");
        brushEnabled = true;
    } else {
        alert(`Please enter a ${name.length > 0 && name.length <= 2 ? "longer" : ""} name`);
    };
}

/////////////////
// Canvas elements
$("#colorPicker").mouseover(function(){
    brushEnabled = false;
});

$("#colorPicker").mouseout(function(){
    brushEnabled = true;
});

document.getElementById("name-submission-button").addEventListener("keypress", function(e){
    if (e.key === 'Enter') {
        captureName();
    }
});

$("paper-swatch-picker").on("color-changed", function(data){
    color = data.originalEvent.detail.value;
});



///////////////
const sketch = (p) => {

    p.setup = function() {
        var canvas = p.createCanvas(myP5.windowWidth, myP5.windowHeight);
        canvas.parent('canvas-container');
    };

    p.draw = function() {
        myP5.clear();
        myP5.translate(translate.x + pan.x, translate.y + pan.y);
        drawBackground();

        checkUpdates();

        drawPainting();
        drawUsers();
        drawBrush();
    };

    p.mousePressed = function() {
        if (myP5.mouseButton === myP5.LEFT) {
            if (brushEnabled) {
                isPainting = true;
                paint();
            }
        }
        if (myP5.mouseButton === myP5.RIGHT) {
            lastRightClick = {x: myP5.mouseX, y: myP5.mouseY};
        }
        if (myP5.mouseButton === myP5.CENTER) {
        }
    };

    p.mouseReleased = function() {
        if (myP5.mouseButton === myP5.LEFT) {
            isPainting = false;
        }
        if (myP5.mouseButton === myP5.RIGHT) {
            translate = {x: translate.x + pan.x, y: translate.y + pan.y};
            pan = {x: 0, y: 0};
            isPanning = false;
        }
    };

    p.mouseWheel = function(event) {
        const m = mouseLoc()
        scale = scale + event.deltaY/100;
        scale = scale < 1 ? 1 : scale;
        translate.x += -event.deltaY/100 * m.x;
        translate.y += -event.deltaY/100 * m.y;
    }

    p.mouseDragged = function() {
        if (myP5.mouseButton === myP5.RIGHT) {
            isPanning = true
            pan = {
                x: -(lastRightClick.x - myP5.mouseX), 
                y: -(lastRightClick.y - myP5.mouseY)
            };
        }
        if (myP5.mouseButton === myP5.LEFT) {
            if (brushEnabled) {
                paint();
            }
        }
    }

    p.windowResized = function() {
        myP5.resizeCanvas(myP5.windowWidth, myP5.windowHeight);
    }
};

export const myP5 = new p5(sketch)

function mouseLoc() {
    let x = Math.round((-(translate.x + pan.x) + myP5.mouseX-scale/2)/scale)
    let y = Math.round((-(translate.y + pan.y) + myP5.mouseY-scale/2)/scale)
    return {x: x, y: y}
}

let mouseLocation = mouseLoc();

function checkUpdates() {
    const loc = mouseLoc()
    if (mouseLocation.x != loc.x || mouseLocation.y != loc.y) {
        mouseLocation = loc;
        sendClientData();
    }
}

function drawBackground() {
    if (scale >= 10) {
        myP5.strokeWeight(0);
        myP5.textSize(scale/4);
        myP5.textAlign(myP5.CENTER, myP5.CENTER);
        for (let i = Math.round(-(translate.x + pan.x)/scale)-1; i < (myP5.windowWidth - translate.x - pan.x)/scale; i++) {
            for (let j = Math.round(-(translate.y + pan.y)/scale)-1; j < (myP5.windowHeight - translate.y - pan.y)/scale; j++) {
                if ((i+j)%2 == 0) {
                    myP5.fill(240 + 10/(scale/10));
                    myP5.rect(i*scale, j*scale, scale, scale);
                }
                if (debug) {
                    if (scale/4 > 8) {
                        myP5.fill(100, 100, 100);
                        myP5.text(`${i};${j}`, i*scale + scale/2, j*scale + scale/2);
                    }
                }
            }
        }        
    }
}

function drawBrush() {
    if (!isPanning && brushEnabled) {
        const loc = mouseLoc();
        myP5.fill(color);
        myP5.rect(loc.x * scale, loc.y * scale, scale, scale);
        if (scale < 7) {
            myP5.noFill();
            myP5.stroke(color);
            myP5.strokeWeight(2/scale);
            myP5.circle(loc.x * scale + scale/2, loc.y * scale + scale/2, 10)
        }
    }
}

function drawUsers() {
    for (let user in users) {
        if (typeof users[user]["loc"] != 'undefined') {
            if (user != socket.id) {
                const loc = users[user]["loc"];
                myP5.fill('purple');
                myP5.rect(loc.x * scale, loc.y * scale, scale, scale);
                myP5.textSize(15);
                myP5.fill(100, 100, 100);
                myP5.textAlign(myP5.LEFT, myP5.BOTTOM);
                myP5.text(user, loc.x * scale + scale + 5, loc.y * scale - 5);
            }
        }
    }
}

function paint() {
    sendClientData();
    // if (typeof art[loc.x] === 'undefined') {
    //     art[loc.x] = {}
    //     art[loc.x][loc.y] = true;
    // } else if (typeof art[loc.x][loc.y] === 'undefined') {
    //     art[loc.x][loc.y] = true;
    // }
}

function sendClientData() {
    const data = {
        "id": socket.id,
        "loc": mouseLocation,
        "isPainting": isPainting,
        "color": color,
    }
    socket.emit("clientData", data)
}

function drawPainting() {
    myP5.strokeWeight((scale-1)/50);
    myP5.stroke(25);
    for (const x in art) {
        for (const y in art[x]) {
            myP5.fill(art[x][y]);
            myP5.rect(x * scale, y * scale, scale, scale)
        }
    }
}