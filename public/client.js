var socket = io();
$(function () {

    // Initialization of cookie data
    var curName = $.cookie('userName');
    var curScheme = $.cookie('userScheme');

    console.log(curScheme);

    // Store users' information(username and user scheme) in the cookie
    socket.on('connect', function() {
        socket.emit('user connect', curName, curScheme, function (data) {
            $.cookie('userName', data.name);
            $.cookie('userScheme', data.color);
        });
    });

    // Index Page
    // Initialization
    var $indexPage = $("#indexPage");
    var $image_1 = $("#image_1");
    var $image_2 = $("#image_2");
    var $name = $("#name");
    var $saveBtn = $("#save");
    var $joinBtn = $("#join");
    var $randomBtn = $("#random");
    var $code = $("#code");
    var $gameCode = $("#gameCode");
    var $enterPrompt = $("#enterPrompt");
    var $userName = $("#userName");
    var userID; // userID
    var isRandom = false; // isRandom model is closed initially

    // Create a new room id and a user (initialization of a new window)
    socket.on('create user and room', function (data) {
        $.cookie('userName', data.newUser.userName);
        $.cookie('userScheme', data.newUser.userScheme);
        $userName.val(data.newUser.userName); // Give a user name to the name area
        $code.html(data.roomID); // Update the html content of code span
        userID = data.newUser.id; // Update the user ID
        console.log(data.newUser.id);
        $name.html(data.prompt); // Update the user's name attention
    });

    // Click the save button event (ask the current user to ensure its current name in the name area and then save)
    // Only the save button can store the name in the cookie
    $saveBtn.click(function saveName() {
        // If user's name is not an alphanumeric string then it cannot be stored in the cookie
        let set = /[^a-zA-Z0-9 ]/;
        let oppoSet = /[a-zA-z0-9]/;
        if (!set.test($userName.val()) && oppoSet.test($userName)) {
            $.cookie('userName', $userName.val()); // update the name in the cookie
            $enterPrompt.html("Your name is stored successfully!");
            socket.emit('save name', {userName: $userName.val(), roomID: $code.html()}); // send the new update to server
            return;
        }
        $enterPrompt.html("Error: Your name is allowed to change to an arbitrary alphanumeric string!");
    });

    // Click the join button event
    $joinBtn.click(function submitRoomInformation() {
        let set = /[^a-zA-Z0-9 ]/;
        let oppoSet = /[a-zA-z0-9]/;
        if ($gameCode.val() === "") {
            $enterPrompt.html("Error: Your game code cannot be empty!");
        } else if ($gameCode.val() === $code.html()) {
            $enterPrompt.html("Error: You are already in this game room!")
        } else if ($userName.val() === "") {
            $enterPrompt.html("Error: Your name cannot be empty!");
        } else if (set.test($userName.val()) || !oppoSet.test($userName)) {
            // If user's name is not an alphanumeric string then it cannot be used
            $enterPrompt.html("Error: Your name is allowed to change to an arbitrary alphanumeric string!");
        } else {
            socket.emit('check room id', {gameCode: $gameCode.val(), curCode: $code.html(), userName: $userName.val()});
        }
    });

    // Click the random button event
    $randomBtn.click(function randomJoinRoom() {
        // If user's name is not an alphanumeric string then it cannot be stored in the cookie
        let set = /[^a-zA-Z0-9 ]/;
        let oppoSet = /[a-zA-z0-9]/;
        if (set.test($userName.val()) || !oppoSet.test($userName)) {
            $enterPrompt.html("Error: Your name is allowed to change to an arbitrary alphanumeric string!");
        } else {
            isRandom = true;  // the user choose the random model
            socket.emit('random join room', {curCode: $code.html(), userName: $userName.val(), isRandom: isRandom});
        }
    });

    // User cannot join the game because reasons (1. the game room is full; 2. the game room exists the same user name)
    socket.on('cannot join', function (data) {
        $enterPrompt.html("Error: " + data);
    });

    // Game Page
    // Initialization
    var $gamePage = $("#gamePage");
    var $gameTitle = $("#information");
    var $prompt = $("#prompt");
    var $image_3 = $("#image_3");
    var $image_4 = $("#image_4");
    var $image_5 = $("#image_5");
    var $image_6 = $("#image_6");
    var isTurn = false; // the current user's turn or not
    var isEnd = false; // the game ends or not
    var userStyle = 0; // 1: go first; 2: go second
    var roomID = ""; // current game room id
    var opponentName = ""; // the current user's opponent

    // Set 3 different color themes for the game
    var $normalBtn = $('#normal'); // normal scheme
    var $brightBtn = $('#bright'); // bright scheme
    var $darkBtn = $('#dark'); // dark scheme

    // Initialization of chessboard
    var chessBoard = [];
    for (let i = 0; i < 16; i++) {
        chessBoard[i] = [];
        for (let j = 0; j < 16; j++) {
            chessBoard[i][j] = 0;
        }
    }

    // Initialization of chessboard by reading the cookie data (component)
    var board = $("#board")[0].getContext('2d');
    if (curScheme === "normal") { // normal
        normalStyle();
    } else if (curScheme === "bright") { // bright
        brightStyle();
    } else if (curScheme === "dark") { // dark
        darkStyle();
    }
    board.fillRect(0,0,555,555);
    drawLine();

    // Start the game
    socket.on('game page', function (data) {
        $indexPage.fadeOut(100); // hide the index page
        $image_1.fadeOut(100); // hide the image
        $image_2.fadeOut(100); // hide the image
        $gamePage.show(); // show the game page
        $image_3.show(); // show the image
        $image_4.show(); // show the image
        $image_5.show(); // show the image
        $image_6.show(); // show the image

        // When enter the game page, the background will change
        if (curScheme === "normal") { // normal
            $("html").css('background-color', "#FFFFFF"); // update the html background
        } else if (curScheme === "bright") { // bright
            $("html").css('background-color', "#B3D9FF"); // update the html background
        } else if (curScheme === "dark") { // dark
            $("html").css('background-color', "#4D4D4D"); // update the html background
        }

        // Get the opponent's name
        opponentName = data.users.filter(function(value) {return value.id !== userID;})[0].userName;

        // Show current user and the opponent
        $gameTitle.html($userName.val() + ", you are playing with " + opponentName);

        // Show the prompt of the playing game
        if (userID === data.firstSelect) { // get who is the first to go
            $prompt.html($userName.val() + ", it is your turn");
            isTurn = true;
            userStyle = 1; // 1 is first
        } else {
            $prompt.html("Please wait for " + opponentName);
            isTurn = false;
            userStyle = 2; // 2 is second
        }

        // Update the roomID
        roomID = data.gameRoom;
    });

    // Users can change the color theme at any time
    $normalBtn.click(function () { // click the normal theme (default theme)
        $("html").css('background-color', "#FFFFFF"); // update the html background
        normalStyle();
        board.fillRect(0,0,555,555);
        drawLine();
        curScheme = "normal";
        $.cookie('userScheme', curScheme);
        update();
    });

    $brightBtn.click(function () { // click the bright theme
        $("html").css('background-color', "#B3D9FF"); // update the html background
        brightStyle();
        board.fillRect(0,0,555,555);
        drawLine();
        curScheme = "bright";
        $.cookie('userScheme', curScheme);
        update();
    });

    $darkBtn.click(function () { // click the dark theme
        $("html").css('background-color', "#4D4D4D"); // update the html background
        darkStyle();
        board.fillRect(0,0,555,555);
        drawLine();
        curScheme = "dark";
        $.cookie('userScheme', curScheme);
        update();
    });

    // click event to update the chessboard (for current user's turn)
    $("#board")[0].onclick = function (e) {
        // If this is your turn and the game is not over
        if (isTurn === true && isEnd === false) {

            // Get the mouse clicked coordinates
            var i = e.offsetX;
            var j = e.offsetY;

            // Transfer the coordinates for the chessboard
            var x = Math.floor(i / 35);
            var y = Math.floor(j / 35);

            // Click the range of the chessboard
            if (x >= 0 && x < 16 && y >= 0 && y < 16) {
                // if users choose the legal place
                if (chessBoard[x][y] === 0) {
                    socket.emit('start game', {
                        chessBoard: chessBoard,
                        x: x,
                        y: y,
                        style: userStyle,
                        gameCode: roomID
                    });
                // if users place their chess piece twice on the same place, then shows the user that this move they selected is illegal
                } else if (chessBoard[x][y] === userStyle) {
                    $prompt.html("There's already your chess piece here!");
                } else if (chessBoard[x][y] !== userStyle) {
                    $prompt.html("There's already your opponent's chess piece here!");
                } else {
                    // Prompt the user it is your turn
                    $prompt.html($userName.val() + ", it is your turn");
                }
            }
            // if this is not your turn and the game is not over
        } else if (isTurn === false && isEnd === false) {
            // Prompt the user it is not your turn
            $prompt.html("Please wait for " + opponentName);
        }
    };

    // Game playing
    socket.on('game playing', function (data) {
        // Update the current client's chessboard
        chessBoard = data.chessBoard;

        // Draw the chess pieces and check the win or lose
        for (let x = 0; x < 16; x++) {
            for (let y = 0; y < 16; y++) {
                if (data.chessBoard[x][y] === 1) {
                    addOneStep(x, y, 1);
                    checkWin(x, y, 1);
                } else if (data.chessBoard[x][y] === 2) {
                    addOneStep(x, y, 2);
                    checkWin(x, y, 2);
                }
            }
        }

        // End the game or not
        if (!isEnd) { // game not ends
            // Transfer the turn
            isTurn = !isTurn;

            // Show the current turn
            if (isTurn === true) {
                $prompt.html($userName.val() + ", it is your turn");
            } else {
                $prompt.html("Please wait for " + opponentName);
            }
        }
    });

    // If the opponent is disconnected with you then you win automatically
    socket.on('disconnect game', function (data) {
        if (userID !== data && isEnd === false) {
            $prompt.html("Your opponent is disconnect with you and you win!");
            isEnd = true;
        }
    });

    // Place one chess piece on the board (x, y, style: 1(go first) or 2(go second))
    var addOneStep = function (x, y, style) {
        // Draw the chess piece on the user's selected legal place
        board.beginPath();
        board.arc(15+x*35, 15+y*35, 12, 0, 2*Math.PI);
        board.closePath();
        var gradient = board.createRadialGradient(15+x*35+2, 15+y*35-2, 15, 15+x*35, 15+y*35, 0);
        if (style === 1 && curScheme === "normal") { // normal background
            gradient.addColorStop(0, "#0a0a0a");
            gradient.addColorStop(1, "#636766");
        } else if (style === 2 && curScheme === "normal"){
            gradient.addColorStop(0, "#D1D1D1");
            gradient.addColorStop(0, "#F9F9F9");
        } else if (style === 1 && curScheme === "bright") { // bright background
            gradient.addColorStop(0, "#200D6C");
            gradient.addColorStop(1, "#ccb3ff");
        }
        else if (style === 2 && curScheme === "bright") {
            gradient.addColorStop(0, "#299286");
            gradient.addColorStop(1, "#F9F9F9");
        }
        else if (style === 1 && curScheme === "dark") { // dark background
            gradient.addColorStop(0, "#000000");
            gradient.addColorStop(1, "#4d4d4d");
        }
        else if (style === 2 && curScheme === "dark") {
            gradient.addColorStop(0, "#f2f2f2");
            gradient.addColorStop(1, "#e6e6e6");
        }
        board.fillStyle = gradient;
        board.fill();
    };

    // WinCheck for up and down (x, y: coordinates of the chessboard; style: 1(go first) or 2(go second))
    function checkWin(x, y, style) {
        var countLR = 0; // count from left(right) to right(left)
        var countUD = 0; // count from up(down) to down(up)
        var countULLR = 0; // count from up-left to low-right
        var countLLUR = 0; // count from low-left to up-right

        // left and right
        for (let i = x; i >= 0; i--) {
            if (chessBoard[i][y] !== style) {
                break;
            }
            countLR++;
        }
        for (let i = x + 1; i < 16; i++) {
            if (chessBoard[i][y] !== style) {
                break;
            }
            countLR++;
        }

        // up and down
        for (let i = y; i >= 0; i--) {
            if (chessBoard[x][i] !== style) {
                break;
            }
            countUD++;
        }
        for (let i = y + 1; i < 16; i++) {
            if (chessBoard[x][i] !== style) {
                break;
            }
            countUD++;
        }

        // up-left and low-right
        var i = x;
        var j = y;
        while (i >= 0 && j >= 0) {
            if (chessBoard[i][j] !== style) {
                console.log(i);
                break;
            }
            countULLR++;
            i--;
            j--;
        }

        i = x + 1;
        j = y + 1;
        while (i < 16 && j < 16) {
            if (chessBoard[i][j] !== style) {
                break;
            }
            countULLR++;
            i++;
            j++;
        }

        // low-left and up-right
        i = x;
        j = y;
        while (i >= 0 && j < 16) {
            if (chessBoard[i][j] !== style) {
                break;
            }
            countLLUR++;
            i--;
            j++;
        }

        i = x + 1;
        j = y - 1;
        while (i < 16 && j >= 0) {
            if (chessBoard[i][j] !== style) {
                break;
            }
            countLLUR++;
            i++;
            j--;
        }

        // Check who is the winner (go first or go second)
        if (countUD >= 5 || countLR >= 5 || countLLUR >= 5 || countULLR >= 5) {
            if (style === userStyle) {
                $prompt.html("Game Over, " + opponentName + " lost, " + "You win!");
            } else {
                $prompt.html("Game Over, " + "You lost, " + opponentName + " win!");
            }
            isEnd = true;
            return;
        }
        if (checkDraw()) {
            $prompt.html("Game Over, the final result is Draw!");
            isEnd = true;
        }
    }

    // Draw the lines on the board for the initialization
    function drawLine () {
        for (let i = 0; i < 16; i++) {
            board.moveTo(15, 15+i*35);
            board.lineTo(540, 15+i*35);
            board.stroke();
            board.moveTo(15+i*35, 15);
            board.lineTo(15+i*35, 540);
            board.stroke();
        }
    }

    // Choose the normal style
    function normalStyle() {
        board.fillStyle = "#EDA012";
        board.strokeStyle = "#000000";
        $normalBtn.css("background-color", "#666633");
        $normalBtn.css("color", "#FFFFFF");
        $brightBtn.css("background-color", "#D4D4AA");
        $brightBtn.css("color", "#808080");
        $darkBtn.css("background-color", "#D4D4AA");
        $darkBtn.css("color", "#808080");
        $gamePage.css("background-color", "#FFFFFF");
        $gameTitle.css("color", "#D98C8C");
        $prompt.css("color", "#D98C8C");
    }

    // Choose the bright style
    function brightStyle() {
        board.fillStyle = "#EEFC9F";
        board.strokeStyle = "#EA7C41";
        $normalBtn.css("background-color", "#D4D4AA");
        $normalBtn.css("color", "#808080");
        $brightBtn.css("background-color", "#666633");
        $brightBtn.css("color", "#FFFFFF");
        $darkBtn.css("background-color", "#D4D4AA");
        $darkBtn.css("color", "#808080");
        $gamePage.css("background-color", "#B3D9FF");
        $gameTitle.css("color", "#FF6666");
        $prompt.css("color", "#FF6666");
    }

    // Choose the dark style
    function darkStyle() {
        board.fillStyle = "#486801";
        board.strokeStyle = "#DCDFD5";
        $normalBtn.css("background-color", "#D4D4AA");
        $normalBtn.css("color", "#808080");
        $brightBtn.css("background-color", "#D4D4AA");
        $brightBtn.css("color", "#808080");
        $darkBtn.css("background-color", "#666633");
        $darkBtn.css("color", "#FFFFFF");
        $gamePage.css("background-color", "#4D4D4D");
        $gameTitle.css("color", "#FFFFFF");
        $prompt.css("color", "#FFFFFF");
    }

    // Check the result is draw or not (if all the places of the chessboard are full)
    function checkDraw () {
        var count = 0;
        for (let i = 0; i < 16; i++) {
            for (let j = 0; j < 16; j++) {
                if (chessBoard[i][j] !== 0) {
                    count++;
                }
            }
        }
        return count === 256;
    }
    
    // Update the whole chessboard when users choose a color scheme
    function update() {
        for (let i = 0; i < 16; i++) {
            for (let j = 0; j < 16; j++) {
                if (chessBoard[i][j] === 1) {
                    addOneStep(i, j, 1);
                } else if (chessBoard[i][j] === 2){
                    addOneStep(i, j, 2);
                }
            }
        }
    }
});