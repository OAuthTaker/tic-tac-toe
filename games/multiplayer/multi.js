var board = [['', '', ''], ['', '', ''], ['', '', '']]
var waiting = firebase.database().ref("waiting")
var games = firebase.database().ref("games")
var game = firebase.database()
var blocks = firebase.database()
var myname;
var oppname;
var mysign;
var oppsign;
var role;
var gameKey;
var gameOver = false;
var turn;
var matchmaking = false;

document.getElementById("match").addEventListener("click", () => {
    if (document.getElementById("name").value == "")
        alert("Name is Empty!")
    else if (matchmaking==false) matchmake(document.getElementById("name").value)
})

function matchmake(name) {
    myname = name
    matchmaking = true
    document.getElementById("status").innerHTML = "Waiting for someone to <br>join..."
    console.log(myname + " started matchmaking")
    waiting.get().then( function (snapshot) {
        if (snapshot.val() == null) {
            document.getElementById("status").innerHTML = "Waiting for someone to <br>join..."
            waiting.set(myname)
            waiting.onDisconnect().set(null)
            waiting.on("value", function (snapshot) {
                if (snapshot.val() != myname) {
                    gameKey = snapshot.val()
                    waiting.off()
                    waiting.set(null)
                    game = firebase.database().ref("games/"+gameKey)
                    blocks = firebase.database().ref("games/"+gameKey+"/blocks")
                    getSign()
                }
            })
        }
        else {
            oppname = snapshot.val()
            if (myname == oppname) myname += " 2"
            toss()
            var ref = games.push({
                [mysign]: myname,
                [oppsign]: oppname,
                aborted: false
            })
            gameKey = ref.key
            waiting.set(gameKey)
            game = firebase.database().ref("games/"+gameKey)
            blocks = firebase.database().ref("games/"+gameKey+"/blocks")
            play()
        }
    })
}

function toss() {
    if (Math.random()>0.5) { mysign='X'; oppsign='O' }
    else { mysign='O'; oppsign='X' }
}

function getSign() {
    game.get().then( function(snapshot) {
        if (snapshot.val().X==myname) {
            mysign = 'X'
            oppsign = 'O'
            oppname = snapshot.val().O
        }
        else {
            mysign = 'O'
            oppsign = 'X'
            oppname = snapshot.val().X
        }
        play()
    })
}

function play() {
    waiting.off()
    console.log("You have been paired as " + mysign)
    console.log("Game Key -> " + gameKey)
    document.querySelector(".hero").innerHTML = `<div class="stats"><div class="stat xx" id="xx">X - Loading...</div>    <div class="stat oo" id="oo">O - Loading...</div>    <div class="stat turn">To Play - X</div></div><div class="grid">      <div class="block 11" id="11"></div> <div class="block 12" id="12"></div> <div class="block 13" id="13"></div> <div class="block 21" id="21"></div> <div class="block 22" id="22"></div> <div class="block 23" id="23"></div> <div class="block 31" id="31"></div> <div class="block 32" id="32"></div> <div class="block 33" id="33"></div></div><div class="result"></div>`
    game.on("value", function(snapshot) {
        if (snapshot.val().aborted)
            updateStatusUI("aborted")
    })
    if (mysign=='X') {
        turn = true;
        updateToPlay()
        myTurn();
        document.getElementById("xx").innerHTML = "X - " + myname  + " (You)"
        document.getElementById("oo").innerHTML = "O - " + oppname + " (Opp)"
    }
    else {
        turn = false;
        updateToPlay()
        oppTurn();
        document.getElementById("xx").innerHTML = "X - " + oppname + " (Opp)"
        document.getElementById("oo").innerHTML = "O - " + myname  + " (You)"
    }
    game.onDisconnect().update({
        winner: diswin(),
        aborted: disabort()
            
    })
}

function myTurn() {
    window.onclick = e => {
        if (turn) {
            id = e.target.id
            if (id >= 11 && id <= 33) {
                if (free(id)) {
                    updateBlock(mysign, id)
                    sendMove(id)
                    overCheck()
                    // turn made false in oppturn after reading own message
                    oppTurn()
                }
            }
        }
    }
}

function oppTurn() {
    blocks.endAt().limitToLast(1).on("child_added", function (data) {
        if (turn==false) {
            id = data.val()[oppsign];
            blocks.off()
            updateBlock(oppsign, id)
            overCheck()
            turn = true
            updateToPlay()
            myTurn()
        }
        else {
            turn=false
            updateToPlay()
        }
    });
}

function updateBlock(sign, id) {
    document.getElementById(id).classList.add(sign)
    switch (id) {
        case '11': board[0][0] = sign; break
        case '12': board[0][1] = sign; break
        case '13': board[0][2] = sign; break
        case '21': board[1][0] = sign; break
        case '22': board[1][1] = sign; break
        case '23': board[1][2] = sign; break
        case '31': board[2][0] = sign; break
        case '32': board[2][1] = sign; break
        case '33': board[2][2] = sign; break
    }
}

function updateToPlay() {
    if (turn) document.querySelector(".turn").innerHTML = "Your Turn"
    else document.querySelector(".turn").innerHTML = "Opponent's Turn"
}

function sendMove(id) {
    blocks.push({
        [mysign]: id
    })
}

function free(id) {
    freee = false;
    switch (id) {
        case '11': if (board[0][0] == '') freee = true; break
        case '12': if (board[0][1] == '') freee = true; break
        case '13': if (board[0][2] == '') freee = true; break
        case '21': if (board[1][0] == '') freee = true; break
        case '22': if (board[1][1] == '') freee = true; break
        case '23': if (board[1][2] == '') freee = true; break
        case '31': if (board[2][0] == '') freee = true; break
        case '32': if (board[2][1] == '') freee = true; break
        case '33': if (board[2][2] == '') freee = true; break
    }
    return freee;
}


function diswin() { 
    if (gameOver==false) return oppname
    else return null
}

function disabort() {
    if (gameOver==false) return true
    else return null
}

function overCheck() {
    var status = "continue"

    var emptycell = false
    for (var i = 0; (i < 3 && emptycell == false); i++) {
        for (var j = 0; (j < 3 && emptycell == false); j++) {
            if (board[i][j] == '') emptycell = true
        }
    }
    if (emptycell == false) status = "tie"

    for (var j = 0; j < 3; j++) {
        if (board[j][0] == board[j][1] && board[j][1] == board[j][2] && board[j][0] == mysign) status = "won"
        else if (board[0][j] == board[1][j] && board[1][j] == board[2][j] && board[0][j] == mysign) status = "won"
    }
    if (board[0][0] == board[1][1] && board[2][2] == board[1][1] && board[0][0] == mysign) status = "won"
    else if (board[0][2] == board[1][1] && board[2][0] == board[1][1] && board[0][2] == mysign) status = "won"

    for (var j = 0; j < 3; j++) {
        if (board[j][0] == board[j][1] && board[j][1] == board[j][2] && board[j][0] == oppsign) status = "lost"
        else if (board[0][j] == board[1][j] && board[1][j] == board[2][j] && board[0][j] == oppsign) status = "lost"
    }
    if (board[0][0] == board[1][1] && board[2][2] == board[1][1] && board[0][0] == oppsign) status = "lost"
    else if (board[0][2] == board[1][1] && board[2][0] == board[1][1] && board[0][2] == oppsign) status = "lost"

    if (status == "won") {
        game.update({
            winner: myname
        })
        updateStatusUI("won")
        gameOver=true
    }
    else if (status=="tie") {
        game.update({
            winner: status
        })
        updateStatusUI(status)
        gameOver=true
    }
    else if (status=="lost") {
        updateStatusUI("lost")
        gameOver=true
    }
}

function updateStatusUI(status) {
    console.log("Winner: " + status)

    if (status == "won") {
        document.querySelector(".result").classList.add("won")
        document.querySelector(".result").innerHTML = `<button class="home" onclick="location.href='multiplayer.html';"> Home </button>`
    }
    if (status == "lost") {
        document.querySelector(".result").classList.add("lost")
        document.querySelector(".result").innerHTML = `<button class="home" onclick="location.href='multiplayer.html';"> Home </button>`
    }
    
    if (status == "tie") {
        document.querySelector(".result").classList.add("tie")
        document.querySelector(".result").innerHTML = `<button class="home" onclick="location.href='multiplayer.html';"> Home </button>`
    }
    
    if (status == "aborted") {
        game.onDisconnect().set({
            winner: "ideal"
        })
        document.querySelector(".result").classList.add("aborted")
        document.querySelector(".result").innerHTML = `<button class="home" onclick="location.href='multiplayer.html';"> Home </button>`
    }
}