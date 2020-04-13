import p5 from "p5/lib/p5.min";
import io from "socket.io-client";

import '@polymer/paper-swatch-picker/paper-swatch-picker.js';
import {MDCTextField} from '@material/textfield';

const textField = new MDCTextField(document.querySelector('.mdc-text-field'));
 

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

let follow = false;
let playerToFollow = '';

const debug = true;

// Websocket setup
const socket = io(window.location.hostname == "localhost" ? "localhost:3000" : window.location.hostname);
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
socket.on('userData', (u) => {
    users = u;
});

// Update usernamelist
socket.on('updateUsernameList', updateUsernameList);

function updateUsernameList() {
    let playersList = $( "#playerList" );
    playersList.empty();

    for (let player in users) {
        if (typeof users[player]["name"] != 'undefined' && typeof users[player]["loc"] != 'undefined') {
            playersList.append(`<button class="mdc-button" id="${player}" style="${player == socket.id ? "" : "color: " + users[player]["color"]}" ${player == socket.id ? "disabled" : ""}>
            <div class="mdc-button__ripple"></div>
            <span class="mdc-button__label">${player == socket.id ? "You (" + users[player]["name"] + ")": users[player]["name"]}</span>
            </button>`)

            // Attach click handler
            $(`#${player}`).click(() => {
                follow = follow ? false : true;
                playerToFollow = follow ? player : "";
            });
        }
    }
}

/////////////////
// Landing screen
document.getElementById("name-submission-field").addEventListener("keypress", function(e){
    if (e.key === 'Enter') {
        captureName();
    }
});

$("#name-submission-button").click(function(e){
        captureName();
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

$("#playerListContainer").mouseover(function(){
    brushEnabled = false;
});

$("#playerListContainer").mouseout(function(){
    brushEnabled = true;
});

document.getElementById("name-submission-button").addEventListener("keypress", function(e){
    if (e.key === 'Enter') {
        captureName();
    }
});

$("paper-swatch-picker").on("color-changed", function(data){
    color = data.originalEvent.detail.value;
    socket.emit("colorChange", color);
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
        // drawBackground();

        checkUpdates();

        drawPainting();
        drawUsers();
        drawBrush();
        followPlayer();
    };

    p.mousePressed = function() {
        if (follow) {
            follow = false;
        } else {
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
        if (brushEnabled) {
        const m = mouseLoc()
        scale = scale + event.deltaY/100;
        scale = scale < 1 ? 1 : scale;
        if (scale != 1) {
            translate.x += -event.deltaY/100 * m.x;
            translate.y += -event.deltaY/100 * m.y;
        }
        }
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
    if (follow && typeof users[playerToFollow]["loc"] != 'undefined') {
        return users[playerToFollow]["loc"];
    } else {
        let x = Math.round((-(translate.x + pan.x) + myP5.mouseX-scale/2)/scale)
        let y = Math.round((-(translate.y + pan.y) + myP5.mouseY-scale/2)/scale)
        return {x: x, y: y}
    }
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

function drawBrush(loc = mouseLoc(), c = color) {
    if (!isPanning && brushEnabled) {
        myP5.fill(c);
        myP5.stroke(50, 50, 50);
        myP5.strokeWeight(scale/10 > 3 ? 3 : scale/10);
        myP5.rect(loc.x * scale, loc.y * scale, scale, scale);
        if (scale < 7) {
            myP5.noFill();
            myP5.stroke(c);
            myP5.strokeWeight(2/scale);
            myP5.circle(loc.x * scale + scale/2, loc.y * scale + scale/2, 10)
        }
    }
}

function drawUsers() {
    for (let user in users) {
        if (typeof users[user]["loc"] != 'undefined' && typeof users[user]["name"] != 'undefined') {
            if (user != socket.id) {
                const loc = users[user]["loc"];
                myP5.fill(users[user]["color"]);
                myP5.stroke(50, 50, 50);
                myP5.strokeWeight(scale/10 > 3 ? 3 : scale/10);
                myP5.rect(loc.x * scale, loc.y * scale, scale, scale);
                if (scale < 7) {
                    myP5.noFill();
                    myP5.stroke(users[user]["color"]);
                    myP5.strokeWeight(2/scale);
                    myP5.circle(loc.x * scale + scale/2, loc.y * scale + scale/2, 10)
                }

                // Username
                myP5.textSize(15);
                myP5.fill(100, 100, 100);
                myP5.noStroke();
                myP5.textAlign(myP5.LEFT, myP5.BOTTOM);
                myP5.text(users[user]["name"].toUpperCase(), loc.x * scale + scale + 5, loc.y * scale - 5);
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

function followPlayer() {
    if (follow) {
        const loc = users[playerToFollow]["loc"];
        translate.x = -loc.x * scale + (myP5.windowWidth - scale)/2
        translate.y = -loc.y * scale + (myP5.windowHeight - scale)/2
    }
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