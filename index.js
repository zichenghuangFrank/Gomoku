var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

// Create the room list (key: roomID, value: users)
var roomList = new Map();

// Create a user list to store all online users' names
var usersNameOnline = [];

//  Select the user who is the first to go
var firstGo = 0;

// Create a user list to store all online users' information
var usersOnline = [];

app.use(express.static('public'));

io.on('connection', function (socket){

    // Initialization of user properties
    var newUser = {};

    // Prompt for client's username
    var attention = "";

    // User connect
    socket.on('user connect', function (userName, userColor, cookieData) {
        if (userName) {// Check the socket is the first time to connect or not
            // Use the cookie data
            console.log("******************");
            console.log(userName);
            console.log("******************");
            newUser.userName = userName;
            newUser.userScheme = userColor;

            // Generate the corresponding prompt
            attention = "Welcome back";

        } else {
            // Generate a random name for a user and show it in the html
            let randomName = randomUsername();
            while (usersNameOnline.includes(randomName)) { // Avoid to generate the repeated name
                randomName = randomUsername();
            }
            newUser.userName = randomName;

            // The default color theme is "normal"
            newUser.userScheme = "normal";

            // Generate the corresponding prompt
            attention = "We created a name for you:";
        }

        newUser.isRandom = false; // define the user's random game property to be false initially
        newUser.id = socket.id; // define the user id to be the socket id
        usersNameOnline.push(newUser.userName); // update the online user name list
        cookieData({userName: newUser.userName, userColor: newUser.userColor}); // Update the cookie data
        console.log(newUser.userName + " connects");

        // Generate a new room first when a user comes in
        let newRoom = randomUniqueCode();
        newUser.room = newRoom; // define the user's room to be the this room
        usersOnline.push(newUser); // update the online user list
        roomList.set(newRoom, [newUser]); // put the user in the map
        socket.join(newRoom); // socket join the generated room

        // Send the userName and room id to the clients
        io.in(newRoom).emit('create user and room', {roomID: newRoom, newUser: newUser, prompt: attention});
    });

    // Update the user's information in the room
    socket.on('save name', function (data) {
        var preUserList = roomList.get(data.roomID);
        preUserList[0].userName = data.userName; // because current room only has one person (the user is in the index page)
        var preUserIndex = findOnlineUserById(preUserList[0].id); // Update the user's name in the users list
        usersOnline[preUserIndex].userName = data.userName;
        roomList.set(data.roomID, preUserList); // Update the user's name in the map
        console.log(roomList);
        console.log(usersOnline);
    });

    // Check the game room exists or not and add a new member
    // Join an appointed room
    socket.on('check room id', function (data) {
        if (!(roomList.has(data.gameCode))) { // if this room id that a player inputs does not exist
            socket.emit('cannot join', "This room does not exist!");
        } else {  // if this room id that a player inputs exists
            if (roomList.get(data.gameCode).length === 2) { // if this room is full
                socket.emit('cannot join', "This room is full! Please change another one.");
                return;
            }
            if (data.gameCode === data.curCode) { // if this user is already in this room
                socket.emit('cannot join', "You are already in this room!");
                return;
            }

            // Get the user's information who clicks the join button
            var addUser = roomList.get(data.curCode)[0];
            // Check again for the user name whether the user changes or not
            if (addUser.userName !== data.userName) {
                addUser.userName = data.userName;
            }
            var addUserIndex = findOnlineUserById(addUser.id); // Update the user's room in the users list
            usersOnline[addUserIndex].room = data.gameCode;
            addUser.room = data.gameCode; // define the new room for the user
            var userSet = roomList.get(data.gameCode);
            userSet.push(addUser); // add the user to the room
            roomList.set(data.gameCode, userSet); // update the room information
            roomList.delete(data.curCode); // delete current room
            socket.leave(data.curCode, null); // socket leave the current room
            socket.join(data.gameCode); // join this game room
            console.log("------------------");
            console.log(roomList);
            console.log(usersOnline);

            // Select who is the first to go randomly
            var tempArr = [];
            tempArr.push(roomList.get(data.gameCode)[0].id);
            tempArr.push(roomList.get(data.gameCode)[1].id);
            firstGo = tempArr[Math.floor(Math.random()*2)];

            // Send the information to clients in the same room
            io.in(data.gameCode).emit('game page', {users: roomList.get(data.gameCode), firstSelect: firstGo, gameRoom: data.gameCode});
        }
    });

    // Random join a room
    socket.on('random join room', function (data) {
        // Random property (if the user chooses the random model then let the variable 'isRandom' be true)
        var randomUser = roomList.get(data.curCode)[0];
        randomUser.isRandom = true;
        roomList.set(data.curCode, [randomUser]); // update the room information

        // Get the map for those rooms that are not full
        let rooms = roomList.keys();
        var notFullRooms = new Map();
        for (let room of rooms) {
            if (room !== data.curCode) { // check the random room is the current room or not
                if (roomList.get(room).length === 1 && roomList.get(room)[0].isRandom === true) { // check the random room is full or not and the user choose the random model or not
                    notFullRooms.set(room, roomList.get(room));
                }
            }
        }

        // Check the notFullRooms is empty or not (if it is empty then there is no extra room)
        if (notFullRooms.size === 0) {
            socket.emit("cannot join", "No room available right now! You are waiting in the queue!")
        } else {

            // Transfer the iterator object to an array (store the rooms' information that are not full)
            let randomList = [];
            for (let i = 0; i < notFullRooms.size; i++) {
                randomList.push(notFullRooms.keys().next().value);
            }

            // Generate a random room for the user to join
            let randomRoom = randomList[Math.floor(Math.random()*(randomList.length))];
            let addUser = roomList.get(data.curCode)[0];

            // Check again for the user name whether the user changes or not
            if (addUser.userName !== data.userName) {
                addUser.userName = data.userName;
            }
            var addUserIndex = findOnlineUserById(addUser.id); // Update the user's room in the users list
            usersOnline[addUserIndex].room = data.gameCode;
            addUser.room = randomRoom; // define the new room for the user
            let userSet = roomList.get(randomRoom);
            userSet.push(addUser); // add the user to the room
            roomList.set(randomRoom, userSet); // update the room information
            roomList.delete(data.curCode); // delete current room
            socket.leave(data.curCode, null); // socket leave the current room
            socket.join(randomRoom); // join this random game room

            // Select who is the first to go
            var tempArr = [];
            tempArr.push(roomList.get(randomRoom)[0].id);
            tempArr.push(roomList.get(randomRoom)[1].id);
            firstGo = tempArr[Math.floor(Math.random()*2)];

            // Send the information to clients in the same room
            io.in(randomRoom).emit('game page', {users: roomList.get(randomRoom), firstSelect: firstGo, gameRoom: randomRoom});
        }

    });

    // Game start
    socket.on('start game', function (data) {
        // Update the whole chessboard (including check there exists already a chess piece on the current location)
        if (data.style === 1 && data.chessBoard[data.x][data.y] === 0) {
            data.chessBoard[data.x][data.y] = 1; // first is 1
        }  else if (data.style === 2 && data.chessBoard[data.x][data.y] === 0) {
            data.chessBoard[data.x][data.y] = 2; // second is 2
        }

        // Send the information to clients in the same room
        io.in(data.gameCode).emit('game playing', {chessBoard: data.chessBoard});
    });

    // Update the user scheme
    socket.on('update user scheme', function (data) {
       let updateUserIndex = findOnlineUserById(socket.id);
       usersOnline[updateUserIndex].userScheme = data.curScheme;
    });

    // Disconnect the user
    socket.on('disconnect', function () {
        console.log("Socket id: " + socket.id + " has disconnected");
        let disconnectUserIndex = findOnlineUserById(socket.id); // find the disconnected user
        let disconnectUser = usersOnline[disconnectUserIndex]; // get the disconnected information
        console.log(disconnectUser);
        socket.leave(disconnectUser.room, null); // socket leave the room

        // Update the current room user list
        let users = roomList.get(disconnectUser.room);
        for (let i = 0; i < users.length; i++) {
            if (users[i].id === disconnectUser.id) {
                users.splice(i, 1);
            }
        }
        // If there is no users in the room then delete the room or update the user's information in the room
        if (users.length === 0) {
            roomList.delete(disconnectUser.room);
        } else {
            roomList.set(disconnectUser.room, users);
        }
        console.log(roomList);

        // Send the message to client side
        io.in(disconnectUser.room).emit('disconnect game', {id: disconnectUser.id});
    });
});

// Generate a random name for a user
function randomUsername() {
    let parts = [];
    parts.push(["Tom ", "Brown ", "White ", "Jerry ", "Frank ", "Lucy ", "Henry "]);
    parts.push(["James", "Tracy", "Kim", "Joe", "John", "Pat", "Kate"]);
    let username = "";
    for (let part of parts) {
        username += part[Math.floor(Math.random()*part.length)];
    }
    return username;
}

// Generate a random unique code for a room id
function randomUniqueCode() {
    var arrNum = [];
    for (let i = 0; i < 5; i++) {
        var val = Math.floor(Math.random() * 100);
        if (arrNum.indexOf(val) === -1) {
            arrNum.push(val);
        } else {
            i--;
        }
    }
    for (let i = 0; i < 5; i++) {
        if (arrNum[i] < 10 && arrNum[i] >= 0) {
            arrNum[i] = arrNum[i].toString();
            arrNum[i] = "0" + arrNum[i];
        } else {
            arrNum[i] = arrNum[i].toString();
        }
    }
    return arrNum.join("");
}

// Find the socket id of the index of each user
function findOnlineUserById(socketId) {
    for (let i = 0; i < usersOnline.length; i++) {
        if (socketId === usersOnline[i].id) {
            return i;
        }
    }
    return -1;
}

// Listen port 3000
http.listen(3000, function() {
    console.log('listening on *:3000');
});