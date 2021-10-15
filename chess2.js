// yeah it may not be the prettiest and it may not be the most optimised and it may not be good
// but uh
// how about you stop being so damn judgemental
// if you really want it to be that good why don't you just go and make Chess 2 yourself
// EXCEPT YOU CAN'T
// cause it's my copyright
// that's right Copyright Henry Warburton 2021
// I said it
// now go fuck yourself

// VERSION 2.0.0
// Henry don't forget to change the changelog and push this rubbish to github if you change something

const Canvas = require('canvas'); // used for rendering images
const { ENGINE_METHOD_PKEY_ASN1_METHS } = require('constants'); // gonna be completely honest I have no idea when I put this here, might not even be needed but im not gonna risk it
const fs = require('fs');

// DEFINING OBJECTS

class chessSquare {
    constructor(chessPiece) {
        this.chessPiece = chessPiece || ''; // object, what chess piece / lack thereof occupies the square
        this.isEmbassyProtected; // bool, if square protected by Embassy
        this.trapPiece = 'noColor'; // str, colour of trap if that square contains one ('noColor' if it does not)
        this.isInked = false; // bool, if square is obfuscated by Ink
    };
};

class chessPiece {
    constructor(pieceType,color,isKing) {
        this.pieceType = pieceType; // object
        this.color = color; // string, white or black
        this.isKing = isKing; // bool, if it's a King
        this.numberOfTimesHasMoved = 0; // int, number of times that piece has moved (not the number of total turns)
        this.respawnPointX; // int, x coordinate of where a piece should respawn from (if it has a respawn ability)
        this.respawnPointY; // int, y "
    };
};

class pieceType {
    constructor(id, fullName, shorthand, sprite, moveSetFunction, description, pieceClass, specialMoveName, specialMoveCost, specialMoveFunction, specialMoveDescription) {
        this.id = id; // int, name in code, MUST MATCH OBJ IDENTIFIER
        this.fullName = fullName; // string, display name
        this.shorthand = shorthand; // string, single representative letter
        this.sprite = sprite; // string, image filename
        this.moveSetFunction = moveSetFunction; // function, returns if piece can move in a given dx/dy
        this.description = description; // string, display description
        this.pieceClass = pieceClass
        this.specialMoveName = specialMoveName; // string, display title of special move
        this.specialMoveCost = specialMoveCost || 0; // int, cost of special move
        this.specialMoveFunction = specialMoveFunction; // function, returns success of special move attempt
        this.specialMoveDescription = specialMoveDescription || 'None'; // string, display description of special move
    };
};

class chessGame {
    constructor(black, white) {
        this.black = black; // user object, black player
        this.black.goldBalance = 1000; // int, amount of gold black has
        this.black.mineCount = 0; // int, number of 'mine' pieces black has (set in the 'boardSetup function')
        this.black.soulBalance = 19; // int, number of pieces black has sacrificed
        this.white = white; // user object, white player
        this.white.goldBalance = 0; // int, amount of gold white has
        this.white.mineCount = 0; // int, number of 'mine' pieces white has (set in the 'boardSetup function')
        this.white.soulBalance = 0; // number of pieces white has sacrificed 
        this.board = []; //array of all chessSquares
        this.turnColor = 'black'; // string, white or black
        this.turnNumber = 1; // int, what turn it is
        this.turnsToSkip = 0; // int, number of turns that should be missed for a player (this is used by the Firework's special move)
        for (var i = 0; i < 16; i++) { //creates an empty board
            this.board[i] = []
            for (var j = 0; j < 16; j++) { 
                this.board[i].push(new chessSquare(new chessPiece(empty,'noColor')));
            }; 
        };
    };
    prettify() { //represent in shorthand on the console
        var prettyBoard = '';
        for (var i = 0; i < 16; i++) {
            for (var j = 0; j < 16; j++) {
                var letter = this.board[j][i].chessPiece.pieceType.shorthand; //gets the shorthand for the piece on that square
                switch (this.board[j][i].chessPiece.color) { //deciding what colour to print the letter
                    case 'black': {
                        letter = letter.black
                    };
                    case 'white': {
                        letter = letter.white
                    };
                    default: {
                        letter = letter.gray
                    };
                };
                prettyBoard = prettyBoard.concat(letter) //generates each row in shorthand
            };
            prettyBoard = prettyBoard.concat('\n'); //moves to next row
        };
        return(prettyBoard);
    };
    move(playerColor,pieceX,pieceY,destinationX,destinationY) { // function assumes data passed is already sanitised
        var moveResult = []; // this will be returned, index 1 is return code, index 2 is return message (error, success, or game victory)
        const chessPieceToMove = this.board[pieceX][pieceY].chessPiece; // defines the chess piece being moved for speed's sake
        var dx = destinationX - pieceX; // calculating change in x
        var dy = destinationY - pieceY; // calculating change in y
        if (this.turnColor != playerColor) { // if it's the wrong turn
            return[2,'It\'s not your turn.'];
        }
        if (chessPieceToMove.color != playerColor) { // if there's no piece there
            return[3,'You do not have a piece there.'];
        };
        if(dx === 0 && dy === 0) { // if the player attempts to leave the piece where it is
            return[4,'You must move the piece.'];  
        };
        if (!chessPieceToMove.pieceType.moveSetFunction(dx,dy,pieceX,pieceY,this.board,playerColor)) { // if the piece cannot move there
            return[5,`${chessPieceToMove.pieceType.fullName} cannot move like that.`];
        };
        if (this.board[destinationX][destinationY].chessPiece.color === playerColor) { // if there is another piece of the same colour there
            return[6,'You cannot take your own piece.'];
        };
        if (this.board[destinationX][destinationY].isEmbassyProtected && this.board[destinationX][destinationY].chessPiece.color != 'noColor') { // if there is a piece within Embassy protection
            return[7,'Cannot take pieces protected by an Embassy.'];
        };
        if (this.board[destinationX][destinationY].chessPiece.pieceType === blockade) {
            return[8,'Cannot take a Blockade.'];
        };
        moveResult = [0,`Moved ${chessPieceToMove.pieceType.fullName} at (${pieceX.toString(16).toUpperCase()},${pieceY.toString(16).toUpperCase()}) to (${destinationX.toString(16).toUpperCase()},${destinationY.toString(16).toUpperCase()}).`]
        var takenPiece = this.board[destinationX][destinationY].chessPiece; // defines the piece the moving piece might take
        if (takenPiece.color != 'noColor') { // if a piece gets taken
            moveResult[1] = moveResult[1].concat(`\n\u2022 Took ${takenPiece.pieceType.fullName}.`);
            // taking special pieces
            if (takenPiece.pieceType === mine) { // if it's a mine
                    this[takenPiece.color].mineCount -= 1; // decrease mine count of respective player
            };
            if (takenPiece.isKing) { // if it's a King
                moveResult = [1,moveResult[1] + `\n\u2022 Won the game.`]; // if the player takes the King, winning the game.
            };
        };

        // ACTUALLY MOVING THE PIECE
        this.board[pieceX][pieceY].chessPiece = new chessPiece(empty,'noColor'); // sets space piece has moved from
        chessPieceToMove.numberOfTimesHasMoved += 1; // increments the number of times that piece has moved
        this.board[destinationX][destinationY].chessPiece = chessPieceToMove; // sets space piece has moved to
        //

        // SPECIAL CONDITIONS (for certain pieces)
        if (chessPieceToMove.pieceType.pieceClass === 'Mutant') { // if it's a Mutant
            if (Math.random() > 0.75) { // 25% chance
                this.board[destinationX][destinationY].chessPiece = new chessPiece(empty,'noColor'); // 25% chance of destroying a mutant pawn once it has moved
                moveResult[1] = moveResult[1].concat(`\n\u2022 Destablised and died.`);
            };
        };
        if (chessPieceToMove.pieceType === bPawn && destinationY === 15) { // if a black pawn reaches the other end
            this.board[destinationX][destinationY].chessPiece = new chessPiece(queen,'black'); // replace it with a Queen
            moveResult[1] += `\n\u2022 Became a Queen.`;
        };
        if (chessPieceToMove.pieceType === wPawn && destinationY === 0) { // if a white pawn reaches the other end
            this.board[destinationX][destinationY].chessPiece = new chessPiece(queen,'white'); // replace it with a Queen
            moveResult[1] += `\n\u2022 Became a Queen.`;
        };
        if (chessPieceToMove.pieceType === bChecker) { // if piece was a black checker
            if (dy === 2) { // if it took a piece
                if (dx === 2) { // if taking to the right
                    takenPiece = this.board[pieceX+1][pieceY+1].chessPiece; // REDEFINES the taken piece
                    moveResult[1] += `\n\u2022 Took ${takenPiece.pieceType.fullName}`;
                    this.board[pieceX+1][pieceY+1].chessPiece = new chessPiece(empty,'noColor'); // removes piece
                } else { // if taking to the left
                    takenPiece = this.board[pieceX-1][pieceY+1].chessPiece; // REDEFINES the taken piece
                    moveResult[1] += `\n\u2022 Took ${takenPiece.pieceType.fullName}`;
                    this.board[pieceX-1][pieceY+1].chessPiece = new chessPiece(empty,'noColor'); // removes piece
                };
            };
            if (destinationY === 15) { // if it reached the other end
                this.board[destinationX][destinationY].chessPiece = new chessPiece(kingChecker,'black');
                moveResult[1] += `\n\u2022 became a King Checker`;
            };
        };
        if (chessPieceToMove.pieceType === wChecker) { // if piece was a white checker
            if (dy === -2) { // if it took a piece
                if (dx === 2) { // if taking to the right
                    takenPiece = this.board[pieceX+1][pieceY-1].chessPiece; // REDEFINES the taken piece
                    moveResult[1] += `\n\u2022 ${takenPiece.pieceType.fullName}`;
                    this.board[pieceX+1][pieceY-1].chessPiece = new chessPiece(empty,'noColor'); // removes piece
                } else { // if taking to the left
                    takenPiece = this.board[pieceX-1][pieceY-1].chessPiece; // REDEFINES the taken piece
                    moveResult[1] += `\n\u2022 ${takenPiece.pieceType.fullName}`;
                    this.board[pieceX-1][pieceY-1].chessPiece = new chessPiece(empty,'noColor'); // removes piece
                };
            };
            if (destinationY === 0) { // if it reached the other end
                this.board[destinationX][destinationY].chessPiece = new chessPiece(kingChecker,'white');
                moveResult[1] += `\n\u2022 Became a King Checker`;
            };
            // NOTICE HOW THIS CASE DOESN'T BREAK, IT'S SO IF AN EMBASSY IS TAKEN STUFF STILL WORKS
        };
        if (chessPieceToMove.pieceType === kingChecker && Math.abs(dy) === 2) { // if a King Checker took a piece
            if (dx === 2 && dy === 2) { // if taking down-right
                takenPiece = this.board[pieceX+1][pieceY+1].chessPiece; // REDEFINES the taken piece
                moveResult[1] += `\n\u2022 ${takenPiece.pieceType.fullName}`;
                this.board[pieceX+1][pieceY+1].chessPiece = new chessPiece(empty,'noColor'); // removes piece
            } else if (dx === -2 && dy === 2) { // if taking down-left
                takenPiece = this.board[pieceX-1][pieceY+1].chessPiece; // REDEFINES the taken piece
                moveResult[1] += `\n\u2022 ${takenPiece.pieceType.fullName}`;
                this.board[pieceX-1][pieceY+1].chessPiece = new chessPiece(empty,'noColor'); // removes piece
            } else if (dx === 2 && dy === -2) { // if taking up-right
                takenPiece = this.board[pieceX+1][pieceY-1].chessPiece; // REDEFINES the taken piece
                moveResult[1] += `\n\u2022 ${takenPiece.pieceType.fullName}`;
                this.board[pieceX+1][pieceY-1].chessPiece = new chessPiece(empty,'noColor'); // removes piece
            } else { // if taking up-left
                takenPiece = this.board[pieceX-1][pieceY-1].chessPiece; // REDEFINES the taken piece
                moveResult[1] += `\n\u2022 ${takenPiece.pieceType.fullName}`;
                this.board[pieceX-1][pieceY-1].chessPiece = new chessPiece(empty,'noColor'); // removes piece
            };
        };
        if (takenPiece.pieceType === cactus) { // if the piece being taken is a Cactus
            this.board[destinationX][destinationY].chessPiece = new chessPiece(empty,'noColor'); // delete the piece
            moveResult[1] += `\n\u2022 Got spiked to death`;
        };
        if (this.board[destinationX][destinationY].trapPiece != 'noColor') { // if the square the piece lands on contains a trap
            if (this.board[destinationX][destinationY].trapPiece != playerColor) { // if it's an enemies mine
                this.board[destinationX][destinationY].chessPiece = new chessPiece(empty,'noColor'); // deletes the piece
                this.board[destinationX][destinationY].trapPiece = 'noColor'; // gets rid of the trap
                moveResult[1] += `\n\u2022 Got trapped and died.`;
                if (takenPiece.isKing) { // if it's a King
                    moveResult = [1,moveResult[1] + `\n\u2022 Lost the game.`]; // if the King gets trapped, losing the Game.
                };
            };
        };
        if (chessPieceToMove.pieceType === weeds) { // if weeds were moved
            this.board[pieceX][pieceY].chessPiece = chessPieceToMove;
        };
        if (chessPieceToMove.pieceType === union && takenPiece.pieceType === capitalist) { // if a Union took a Capitalist
            moveResult[1] += `\n\u2022 Won a bonus of 100 Gold for the liberated workers.`;
            this[playerColor].goldBalance += 100;
        };
        if (takenPiece.pieceType === jesusPhase2) {
            if (this.board[takenPiece.respawnPointX][takenPiece.respawnPointY].chessPiece.pieceType != egg) { // if the respawn egg was moved, taken, etc.
                moveResult[1] += `\n\u2022 The Messiah tried to resurrect, but was unable.`
            } else { // if the respawn egg is intact
                this.board[takenPiece.respawnPointX][takenPiece.respawnPointY].chessPiece = new chessPiece(jesusPhase1,takenPiece.color)
                moveResult[1] += `\n\u2022 The Messiah was resurrected.`
            };
        };
        if (chessPieceToMove.pieceType === embassy || takenPiece.pieceType === embassy) { // if piece moved or taken was an Embassy, or if it's the first turn
            this.checkEmbassies();
        };

        this.incrementTurn(); // finally, does everything that needs to be done at the end of a turn
        return moveResult;
    };
    specialMove(playerColor,pieceX,pieceY,targetX,targetY) { // function assumes data passed is already sanitised
        var specialMoveResult = []; // this will be returned, index 1 is return code, index 2 is return message (error, success, or game victory)
        const chessPieceToSpecialMove = this.board[pieceX][pieceY].chessPiece; // defines the chess piece being moved for speed's sake
        var specialMoveCost = chessPieceToSpecialMove.pieceType.specialMoveCost; // defines the cost of the special move
        var balanceInConsideration; // defines which player's balance to check
        if (playerColor === 'black') { // if it's black playing
            balanceInConsideration = this.black.goldBalance;
        } else { // if it's white playing
            balanceInConsideration = this.white.goldBalance;
        };
        if (this.turnColor != playerColor) { // if it's the wrong turn
            specialMoveResult = [2,'It\'s not your turn.'];
            return specialMoveResult;
        }
        if (chessPieceToSpecialMove.color != playerColor) { // if there's no piece there
            specialMoveResult = [3,'You do not have a piece there.'];
            return specialMoveResult;
        };
        if (!chessPieceToSpecialMove.pieceType.specialMoveName) { // if that piece has no special move
            specialMoveResult = [4, `${chessPieceToSpecialMove.pieceType.fullName} has no Special Move.`]
            return specialMoveResult;
        };
        if (chessPieceToSpecialMove.pieceType.specialMoveCost > balanceInConsideration) { // if that piece's special move is too expensive
            specialMoveResult = [5,'You do not have enough Gold to do that.'];
            return specialMoveResult;
        };
        specialMoveResult = chessPieceToSpecialMove.pieceType.specialMoveFunction(pieceX,pieceY,this,playerColor,targetX,targetY);
        // SPECIAL CONDITIONS
        if (chessPieceToSpecialMove.pieceType.pieceClass === 'Magic') { // if it's a Magic piece
            // check in surrounding squares for a Cat
            var surroundingSquares = []
            if (pieceX != 0  && pieceY != 0 ) surroundingSquares.push([[pieceX-1],[pieceY-1]]); // NW
            if (                pieceY != 0 ) surroundingSquares.push([[pieceX],[pieceY-1]]);   // N
            if (pieceX != 15 && pieceY != 0 ) surroundingSquares.push([[pieceX+1],[pieceY-1]]); // NE
            if (pieceX != 15                ) surroundingSquares.push([[pieceX+1],[pieceY]]);   // E
            if (pieceX != 15 && pieceY != 15) surroundingSquares.push([[pieceX+1],[pieceY+1]]); // SE
            if (                pieceY != 15) surroundingSquares.push([[pieceX],[pieceY+1]]);   // W
            if (pieceX != 0  && pieceY != 15) surroundingSquares.push([[pieceX-1],[pieceY+1]]); // SW
            if (pieceX != 0                 ) surroundingSquares.push([[pieceX-1],[pieceY]]);   // W
            for (var i = 0; i < surroundingSquares.length; i++) { // deleting pieces
                if (this.board[surroundingSquares[i][0]][surroundingSquares[i][1]].chessPiece.pieceType === cat) {
                    specialMoveResult[1] += `\n\u2022 Cost halved by presence of Cat.`;
                    specialMoveCost = Math.floor(specialMoveCost / 2); 
                };
            };
        };
        //
        if (specialMoveResult[0] === 0) { // specialMoveResult[0] = 0 corresponds to a successful special move attempt
            this.incrementTurn(); // finally, does everything that needs to be done at the end of a turn
            if (playerColor === 'black') { // if black just played
                this.black.goldBalance -= specialMoveCost; // deducts from black's balance
            } else {
                this.white.goldBalance -= specialMoveCost; // deducts from white's balance
            };
        };

        if (specialMoveResult[2]) { // this will be true if a special move function has returned a necessity to recheck embassies
            this.checkEmbassies();
        };

        return specialMoveResult;
    };
    incrementTurn() {
        this.turnNumber ++; // increments the turn number
        this.black.goldBalance += this.black.mineCount; // adds gold to black's balance
        this.white.goldBalance += this.white.mineCount; // adds gold to white's balance
        if (this.turnsToSkip > 0) { // only does so if turn should be skipped (this will only be false if a firework is used)
            this.turnsToSkip -= 1;
        } else { 
            // if (this.turnColor === 'black') { // if it was just black's turn
            //     this.turnColor = 'white'; // it's now white's
            // } else {
            //     this.turnColor = 'black'; // it's now black's
            // };
        };
    };
    checkEmbassies() {
        for (var i = 0; i < 16; i++) {
            for (var j = 0; j < 16; j++) { // for every square on the board
                var surroundingSquares = []
                if (i != 0  && j != 0 ) surroundingSquares.push(this.board[i-1][j-1]); // if NW square...
                if (           j != 0 ) surroundingSquares.push(this.board[i][j-1]);   // ...or N...
                if (i != 15 && j != 0 ) surroundingSquares.push(this.board[i+1][j-1]); // ...or NE...
                if (i != 15           ) surroundingSquares.push(this.board[i+1][j]);   // ...or E...
                if (i != 15 && j != 15) surroundingSquares.push(this.board[i+1][j+1]); // ...or SE...
                if (           j != 15) surroundingSquares.push(this.board[i][j+1]);   // ...or S...
                if (i != 0  && j != 15) surroundingSquares.push(this.board[i-1][j+1]); // ...or SW...
                if (i != 0            ) surroundingSquares.push(this.board[i-1][j]);   // ...or W...
                for (var k = 0; k < surroundingSquares.length; k++) {
                    if (surroundingSquares[k].chessPiece.pieceType === embassy) { // ...contains an Embassy
                        this.board[i][j].isEmbassyProtected = true;
                        break; // stop looking once at least one has been found
                    } else { // ... doesn't contain an Embassy
                        this.board[i][j].isEmbassyProtected = false;
                    };
                };
            };
        };
        return this;
    };
    checkMines() {
        for (var i = 0; i < 16; i++) {
            for (var j = 0; j < 16; j++) {
                const workingPiece = this.board[i][j].chessPiece
                if (workingPiece.pieceType === mine) { // checking if it's a mine
                    if (workingPiece.color === 'black') { // if the mine is black
                        this.black.mineCount += 1
                    } else { // if the mine is white
                        this.white.mineCount += 1
                    };
                };
            };
        };
        return this;
    };
};

// DEFINING MOVESETS
// these bad boys are passed a displacement (dx,dy), sometimes the origin of the piece (x,y), and sometimes the board itself (board), so it can check if a piece can move like that. They all return a Boolean
// before the moveset is checked, program should ensure a movement of (0,0) is not being proposed
inMSBishop = (dx,dy,x,y,board) => {
    var canMove;
    canMove = (Math.abs(dx) === Math.abs(dy)); // movement is of the same magnitude in each axis (diagonal)
    if (canMove) { // checking if there are pieces in the way
        if (dx > 0 && dy > 0) { // if moving right-down
            for (var i = 1; i < dx; i++) {
                if(board[x+i][y+i].chessPiece.color != 'noColor') {
                    canMove = false;
                    break;
                };
            };
        } else if (dx > 0 && dy < 0) { // if moving right-up
            for (var i = 1; i < dx; i++) {
                if(board[x+i][y-i].chessPiece.color != 'noColor') {
                    canMove = false;
                    break;
                };
            };
        } else if (dx < 0 && dy > 0) { // if moving left-down
            for (var i = 1; i < Math.abs(dx); i++) {
                if(board[x-i][y+i].chessPiece.color != 'noColor') {
                    canMove = false;
                    break;
                };
            };
        } else { // if moving left-up
            for (var i = 1; i < Math.abs(dx); i++) {
                if(board[x-i][y-i].chessPiece.color != 'noColor') {
                    canMove = false;
                    break;
                };
            };
        };
    }; 
    return canMove;
};
inMSRook = (dx,dy,x,y,board) => {
    var canMove = (dx === 0 || dy === 0); // movement is along only one axis
    if (canMove) { // checking if there are pieces in the way
        if (dx > 0) { // if piece is moving right
            for (var i = 1; i < dx; i++) {
                if(board[x+i][y].chessPiece.color != 'noColor') {
                    canMove = false;
                    break;
                };
            };
        } else if (dx < 0) { // if piece is moving left
            for (var i = -1; i > dx; i--) {
                if(board[x+i][y].chessPiece.color != 'noColor') {
                    canMove = false;
                    break;
                };
            };
        } else if (dy > 0) { // if piece is moving down
            for (var i = 1; i < dy; i++) {
                if(board[x][y+i].chessPiece.color != 'noColor') {
                    canMove = false;
                    break;
                };
            };
        } else { // if piece is moving up
            for (var i = -1; i > dy; i--) {
                if(board[x][y+i].chessPiece.color != 'noColor') {
                    canMove = false;
                    break;
                };
            };
        };
    };
    return canMove;
};
inMSQueen = (dx,dy,x,y,board) => {
    return (inMSBishop(dx,dy,x,y,board) || inMSRook(dx,dy,x,y,board)); // movement like either a rook or bishop
};
inMSKing = (dx,dy) => {
    return (Math.abs(dx) === 1 || Math.abs(dy) === 1); // magnitude of movement in any axis is 1
};
inMSKnight = (dx,dy,x,y,board) => {
    canMove = ((Math.abs(dx) === 1 && Math.abs(dy) === 2) || (Math.abs(dy) === 1 && Math.abs(dx) === 2)); // movement is (1,2) or (2,1) (in any direction)
    if (canMove) { // checking for barriers in the way
        if (dx === 2) { // if moving right
            if (board[x+1][y].chessPiece.pieceType.id === 'barrier' || board[x+2][y].chessPiece.pieceType.id === 'barrier') { // if there is a barrier in the way
                canMove = false;
            };
        } else if (dx === -2) { // if moving left
            if (board[x-2][y].chessPiece.pieceType.id === 'barrier' || board[x-2][y].chessPiece.pieceType.id === 'barrier') { // if there is a barrier in the way
                canMove = false;
            };
        } else if (dy === 2) { // if moving down
            if (board[x][y+1].chessPiece.pieceType.id === 'barrier' || board[x][y+2].chessPiece.pieceType.id === 'barrier') { // if there is a barrier in the way
                canMove = false;
            };
        } else { // if moving up
            if (board[x][y-1].chessPiece.pieceType.id === 'barrier' || board[x][y-2].chessPiece.pieceType.id === 'barrier') { // if there is a barrier in the way
                canMove = false;
            };
        };
    };
    return canMove;
};
inMSWPawn = (dx,dy,x,y,board) => {
    var canMove = false;
    if (dx === 0) { // if trying to move only forwards
        if (dy != -1) { // if not moving 1 forwards
            if (dy === -2 && board[x][y].chessPiece.numberOfTimesHasMoved === 0) { // if it hasn't moved yet
                if (board[x][y-2].chessPiece.color === 'noColor') { // if there is no piece in the way
                    canMove = true;
                };
            };
        } else { // if moving 1 forwards any turn
            if (board[x][y-1].chessPiece.color === 'noColor') { // if there is no piece in the way
                canMove = true;
            };
        }
    } else { // if trying to diagonally (and take)
        if (dx === 1 && dy === -1 && board[x+1][y-1].chessPiece.color === 'black') { // if taking diagonally up-right
            canMove = true;
        } else if (dx === -1 && dy === -1 && board[x-1][y-1].chessPiece.color === 'black') { // if trying to take diagonally up-left
            canMove = true
        };
    };
    return canMove;
};
inMSBPawn = (dx,dy,x,y,board) => {
    var canMove = false;
    if (dx === 0) { // if trying to move only downwards
        if (dy != 1) { // if not moving 1 downwards
            if (dy === 2 && board[x][y].chessPiece.numberOfTimesHasMoved === 0) { // if it hasn't moved yet
                if (board[x][y+2].chessPiece.color === 'noColor') { // if there is no piece in the way
                    canMove = true;
                };
            };
        } else { // if moving 1 downwards any turn
            if (board[x][y+1].chessPiece.color === 'noColor') { // if there is no piece in the way
                canMove = true;
            };
        }
    } else { // if trying to diagonally (and take)
        if (dx === 1 && dy === 1 && board[x+1][y+1].chessPiece.color === 'white') { // if taking diagonally down-right
            canMove = true;
        } else if (dx === -1 && dy === 1 && board[x-1][y+1].chessPiece.color === 'white') { // if trying to take diagonally down-left
            canMove = true
        };
    };
    return canMove;
};
inMSNESW = (dx,dy) => {
    return((Math.abs(dx) === 1 && dy === 0) || (Math.abs(dy) === 1 && dx === 0)) // movement is 1 either up, down, left or right
};
inMSPig = (dx,dy,x,y,board) => {
    return (board[x+dx][y+dy].chessPiece.color === 'noColor'); // there are no pieces at the destination
};
inMSMutant = (dx,dy) => {
    return (Math.abs(dx) < 3 && Math.abs(dy) < 3); // movement is in a 5x5 grid
};
inMSImmobile = () => {
    return false;
}
inMSBChecker = (dx,dy,x,y,board,playerColor) => {
    if (dy === 1 && Math.abs(dx) === 1 && board[x+dx][y+1].chessPiece.color === 'noColor') { // moving diagonally forwards by one into an unoccupied space
        return true; 
    };
    if (dy === 2 // moving down by two
        && Math.abs(dx) === 2 // moving across by two in any direction
        && board[x+(dx/2)][y+1].chessPiece.color != playerColor // taking a piece that is not the same colour
        && board[x+(dx/2)][y+1].chessPiece.color != 'noColor' // not trying to take an empty space
        && board[x+(dx/2)][y+1].chessPiece.pieceType != barrier) // not trying to take a barrier
        {
        return true;
    };
    return false; // if all else fails, return flase
};
inMSWChecker = (dx,dy,x,y,board,playerColor) => {
    if (dy === -1 && Math.abs(dx) === 1 && board[x+dx][y-1].chessPiece.color === 'noColor') { // moving diagonally forwards by one into an unoccupied space
        return true; 
    };
    if (dy === -2 // moving up by two
        && Math.abs(dx) === 2 // moving across by two in any direction
        && board[x+(dx/2)][y-1].chessPiece.color != playerColor // taking a piece that is not the same colour
        && board[x+(dx/2)][y-1].chessPiece.color != 'noColor' // not trying to take an empty space
        && board[x+(dx/2)][y-1].chessPiece.pieceType != barrier) // not trying to take a barrier
        {
        return true;
    };
    return false; // if all else fails, return flase
};
inMSKingChecker = (dx,dy,x,y,board,playerColor) => {
    return (inMSBChecker(dx,dy,x,y,board,playerColor) || inMSWChecker(dx,dy,x,y,board,playerColor)); // movement is that of either a black checker or a white checker
};
inMSEW = (dx,dy) => {
    return (dy === 0 && Math.abs(dx) === 1); // movement is only sideways, and by one
};
inMSWeeds = (dx,dy,x,y,board) => {
    return (inMSKing(dx,dy) && inMSPig(dx,dy,x,y,board));
};
inMSCrab = (dx,dy,x,y,board) => {
    if (dy != 0) { // moving up or down at all
        return false;
    } else {
        return inMSRook(dx,dy,x,y,board);
    };
};
inMSMole = (dx,dy) => {
    return((Math.abs(dx) === 1 && Math.abs(dy) === 2) || (Math.abs(dy) === 1 && Math.abs(dx) === 2)); // movement is (1,2) or (2,1) (in any direction)
};

// DEFINING SPECIAL MOVES
// It's the same story with these as with the inMS functions tbh. They do mutilate the chessGame that they get passed though
// before the special move is checked, program should ensure player has enough Gold
specialMoveRefurbish = (x,y,chessGame,playerColor) => {
    if(playerColor === 'black') { // if it's black's turn
        chessGame.black.mineCount += 1;
    } else { // if it's white's turn
        chessGame.white.mineCount += 1;
    };
    chessGame.board[x][y].chessPiece = new chessPiece(mine, playerColor);
    return [0,`Converted Rook at (${x.toString(16).toUpperCase()},${y.toString(16).toUpperCase()}) into a brand spanking new Mine!`];
};
specialMoveSeaSummon = (x,y,chessGame,playerColor) => {
    var prawnsSummoned = 0; // how many prawns the poseidon has summoned
    var rankToSummon; // where the prawns should be summoned
    var pieceToSummon; // what piece should be summoned
    if (playerColor === 'black') { // if the player is black
        rankToSummon = 3;
        pieceToSummon = new chessPiece(bPrawn, 'black');
    } else { // if the player is white
        rankToSummon = 12;
        pieceToSummon = new chessPiece(wPrawn, 'white');
    }
    for (var i = 0; i < 16; i++) {
        if (chessGame.board[i][rankToSummon].chessPiece.pieceType.shorthand === '0') { // if there is nothing there already
            chessGame.board[i][rankToSummon].chessPiece = pieceToSummon; // summons the prawn there
            prawnsSummoned += 1;
        };
    };
    if (prawnsSummoned === 0) { // if no prawns could be summoned
        return[6,`Could not summon any Prawns.`];
    } else { // if prawns could be summoned
        return[0,`Hydrologer at (${x.toString(16).toUpperCase()},${y.toString(16).toUpperCase()}) summoned ${prawnsSummoned} Prawns!`];
    };
};
specialMoveMutation = (x,y,chessGame,playerColor,targetX,targetY) => {
    if (chessGame.board[targetX][targetY].chessPiece.color != playerColor) { // if the player does not have a piece there
        return [6, 'Nothing there to mutate.'];
    } else if (chessGame.board[targetX][targetY].chessPiece.isKing) {
        return [6, 'Cannot Mutate the King!'];
    } else {
        const returnMessage = `Mutated ${chessGame.board[targetX][targetY].chessPiece.pieceType.fullName} at (${targetX.toString(16).toUpperCase()},${targetY.toString(16).toUpperCase()}) into `;
        const shouldCheckEmbassies = false;
        switch (chessGame.board[targetX][targetY].chessPiece.pieceType.pieceClass) {
            case 'Bureaucrat': {
                chessGame.board[targetX][targetY].chessPiece = new chessPiece(capitalist, playerColor);
                if (chessGame.board[targetX][targetY].chessPiece.pieceType === embassy) { // if an embassy was mutated
                    shouldCheckEmbassies = true; // pass need to refresh embassy protections
                };
                break;
            } case 'Mutant': {
                chessGame.board[targetX][targetY].chessPiece = new chessPiece(goop, playerColor);
                break;
            } case 'Pawn': {
                chessGame.board[targetX][targetY].chessPiece = new chessPiece(mutantPawn,playerColor);
                break;
            } case 'Sea Creature': {
                chessGame.board[targetX][targetY].chessPiece = new chessPiece(octopus,playerColor);
                break;
            } case 'Quadruped': {
                chessGame.board[targetX][targetY].chessPiece = new chessPiece(pegasus,playerColor);
                break;
            } case 'Clergy': {
                chessGame.board[targetX][targetY].chessPiece = new chessPiece(archbishop,playerColor);
                break;
            } case 'Structure': {
                chessGame.board[targetX][targetY].chessPiece = new chessPiece(keep,playerColor);
                if (chessGame.board[targetX][targetY].chessPiece.pieceType.id === 'mine') { // if the piece transformed is a mine
                    chessGame[chessGame.board[targetX][targetY].chessPiece.color].mineCount += 1; // decreases mine count of respective player
                };
                break;
            } case 'Plant': {
                chessGame.board[targetX][targetY].chessPiece = new chessPiece(cactus,playerColor);
                break;
            } case 'Magic': {
                chessGame.board[targetX][targetY].chessPiece = new chessPiece(wizard,playerColor);
                break;
            } case 'Checker': {
                chessGame.board[targetX][targetY].chessPiece = new chessPiece(kingChecker,playerColor);
                break;
            } case 'Explosive': {
                chessGame.board[targetX][targetY].chessPiece = new chessPiece(nuke,playerColor);
                break;
            } case 'Supermutant': {
                return[6, 'Cannot mutate that anymore!'];
            } case 'Sneaky': {
                chessGame.board[targetX][targetY].chessPiece = new chessPiece(troll,playerColor);
                break;
            } case 'Tech': {
                chessGame.board[targetX][targetY].chessPiece = new chessPiece(hacker,playerColor);
                break;
            } case 'Proletariat': {
                chessGame.board[targetX][targetY].chessPiece = new chessPiece(union,playerColor);
                break;
            } case 'Deity': {
                chessGame.board[targetX][targetY].chessPiece = new chessPiece(empty,'noColor');
                return [0,returnMessage+'God, but God didn\'t show up, as usual.'];
            } case 'Gamete': {
                chessGame.board[targetX][targetY].chessPiece = new chessPiece(porn,playerColor);
                break;
            } case 'Defence': {
                chessGame.board[targetX][targetY].chessPiece = new chessPiece(mortar,playerColor);
                break;
            };
        };
        return[0, returnMessage+chessGame.board[targetX][targetY].chessPiece.pieceType.fullName+'.',shouldCheckEmbassies];
    };
};
specialMoveFlower = (x,y,chessGame,playerColor,targetX,targetY) => {
    if (chessGame.board[targetX][targetY].chessPiece.color === 'noColor') { // if the target space is unoccupied
        chessGame.board[targetX][targetY].chessPiece = new chessPiece(flower, playerColor);
        return[0, `Planted a beautiful Flower at (${targetX.toString(16).toUpperCase()},${targetY.toString(16).toUpperCase()}).`]
    } else { // if there is something in the way
        return[6, `There is a piece in the way.`]
    };
};
specialMoveInauguration = (x,y,chessGame,playerColor,targetX,targetY) => {
    if (chessGame.board[targetX][targetY].chessPiece.isKing && chessGame.board[targetX][targetY].chessPiece.color === playerColor) { // if the player is trying to inaugurate their own King
        return[6,'Cannot inaugurate your own King.'];
    };
    if (Math.abs(targetX-x) > 2 || Math.abs(targetY-y) > 2) { // if outside of a 5x5 square
        return[6,'Too far away to inaugurate'];
    };
    if (playerColor === 'black') { // if player is black
        if (chessGame.board[targetX][targetY].chessPiece.pieceType === bPawn) {
            chessGame.board[targetX][targetY].chessPiece = new chessPiece(queen,'black');
            return[0,`Pawn at (${targetX.toString(16).toUpperCase()},${targetY.toString(16).toUpperCase()}) inaugurated.`];
        } else {
            return [6,'There is no Pawn there.'];
        };
    } else { // if player is white
        if (chessGame.board[targetX][targetY].chessPiece.pieceType === wPawn) {
            chessGame.board[targetX][targetY].chessPiece = new chessPiece(queen,'white');
            return[0,`Pawn at (${targetX.toString(16).toUpperCase()},${targetY.toString(16).toUpperCase()}) inaugurated.`];
        } else {
            return [6,'There is no Pawn there.'];
        };
    };
};
specialMoveStealGold = (x,y,chessGame,playerColor) => {
    if (playerColor === 'black') { // if player is black
        if (Math.random() > 0.33) { // 66% of the time
            chessGame.black.goldBalance += 3;
            chessGame.white.goldBalance -= 3;
            if(chessGame.white.goldBalance > 0) chessGame.white.goldBalance = 0; // sets balance back to 0 if it went negative
            return [0,'The Spell was successful and you stole 3 Gold from White.'];
        } else { // 33% of the time
            chessGame.white.goldBalance += 6;
            chessGame.black.goldBalance -= 3;
            if(chessGame.black.goldBalance > 0) chessGame.black.goldBalance = 0; // sets balance back to 0 if it went negative
            return [0,'The Spell backfired and White stole 3 Gold from you! They also anonymously gained 3 more Gold.'];
        };
    } else { // if player is white
        if (Math.random() > 0.33) { // 66% of the time
            chessGame.white.goldBalance += 3;
            chessGame.black.goldBalance -= 3;
            if(chessGame.black.goldBalance > 0) chessGame.black.goldBalance = 0; // sets balance back to 0 if it went negative
            return [0,'The Spell was successful and you stole 3 Gold from Black.'];
        } else { // 33% of the time
            chessGame.black.goldBalance += 6;
            chessGame.white.goldBalance -= 3;
            if(chessGame.white.goldBalance > 0) chessGame.white.goldBalance = 0; // sets balance back to 0 if it went negative
            return [0,'The Spell backfired and Black stole 3 Gold from you! They also anonymously gained 3 more Gold.'];
        };
    };
};
specialMoveExplode = (x,y,chessGame,playerColor) => {
    // returns a boolean that will ensure embassies are checked if they need to be, this will be passed at return[2]
    var ownKingExploded, opponentsKingExploded, shouldCheckEmbassies; // these will help us later ;)
    var surroundingSquares = [[x,y]]
    if (x != 0  && y != 0 ) surroundingSquares.push([[x-1],[y-1]]); // NW
    if (           y != 0 ) surroundingSquares.push([[x],[y-1]]);   // N
    if (x != 15 && y != 0 ) surroundingSquares.push([[x+1],[y-1]]); // NE
    if (x != 15           ) surroundingSquares.push([[x+1],[y]]);   // E
    if (x != 15 && y != 15) surroundingSquares.push([[x+1],[y+1]]); // SE
    if (           y != 15) surroundingSquares.push([[x],[y+1]]);   // W
    if (x != 0  && y != 15) surroundingSquares.push([[x-1],[y+1]]); // SW
    if (x != 0            ) surroundingSquares.push([[x-1],[y]]);   // W
    for (var i = 0; i < surroundingSquares.length; i++) { // deleting pieces
        // special cases
        var pieceToCheck = chessGame.board[surroundingSquares[i][0]][surroundingSquares[i][1]].chessPiece;
        switch (pieceToCheck.pieceType.id) { // checking for special pieces
            case 'mine': { // if a mine gets exploded
                chessGame[pieceToCheck.color].mineCount -= 1; // decrease mine count of respective player
                break;
            } case 'embassy': { // if an embassy gets exploded
                shouldCheckEmbassies = true; // resets all embassy protections
                break;
            };
        };
        if (pieceToCheck.isKing) { // if a King was exploded
            if (pieceToCheck.color === playerColor) { // if they blew up their own King
                ownKingExploded = true;
            } else { // if they blew up their opponents
                opponentsKingExploded = true;
            };
        };
        chessGame.board[surroundingSquares[i][0]][surroundingSquares[i][1]].chessPiece = new chessPiece(empty,'noColor'); // actually deleting it
        chessGame.board[surroundingSquares[i][0]][surroundingSquares[i][1]].isInked = false; // un-inking the square if there was ink there
    };
    if (ownKingExploded) { // if their own King was exploded
        if (opponentsKingExploded) { // if both Kings were exploded
            return [1,`Exploded Bomb at (${x.toString(16).toUpperCase()},${y.toString(16).toUpperCase()}) and killed both Kings. Draw.`,shouldCheckEmbassies];
        } else { // if only your own king was exploded
            return [1,`Exploded Bomb at (${x.toString(16).toUpperCase()},${y.toString(16).toUpperCase()}) and killed your own King. You lose.`,shouldCheckEmbassies];
        };
    };
    if (opponentsKingExploded) { // if ONLY the Opponents King was exploded
        return [1,`Exploded Bomb at (${x.toString(16).toUpperCase()},${y.toString(16).toUpperCase()}) and killed your opponent's King. You win.`,shouldCheckEmbassies];
    };
    return [0,`Exploded Bomb at (${x.toString(16).toUpperCase()},${y.toString(16).toUpperCase()}).`,shouldCheckEmbassies]; // if no kings were exploded
};
specialMoveNuclearBomb = (x,y,chessGame,playerColor) => { 
    for (var i = 0; i < 16; i++) {
        for (var j = 0; j < 16; j++) {
            chessGame.board[i][j].isInked = false; // de-inking the square, just in case it was inked
            randomNumber = Math.random()
            if (!chessGame.board[i][j].chessPiece.isKing) { // makes sure Kings (or disguised kings) do not get affected
                if (chessGame.board[i][j].chessPiece.color === 'noColor') { // if it's an empty square
                    if (randomNumber > 0.9) { // 10% chance
                        chessGame.board[i][j].chessPiece = new chessPiece(goop,'gray');
                    };
                } else { // if it's a square with a piece in it
                    if (randomNumber < 0.33) { // 33% chance
                        chessGame.board[i][j].chessPiece = new chessPiece(empty,'noColor'); // destroys piece
                    } else if (randomNumber < 0.66) { // 33% chance
                        specialMoveMutation(0,0,chessGame,chessGame.board[i][j].chessPiece.color,i,j); // mutates piece
                    };
                };
            };
        };
    };
    chessGame = chessGame.checkMines().checkEmbassies();
    return [0,`KABOOM!`];
};
specialMoveNegotions = (x,y,chessGame,playerColor) => {
    if (playerColor === 'black') { // if embassy is black
        chessGame.white.goldBalance += 5;
    } else { // if embassy is white
        chessGame.black.goldBalance += 5;
    };
    return [0,'5 Gold has been transferred.']
};
specialMoveSacrificePawn = (x,y,chessGame,playerColor,targetX,targetY) => {
    if (playerColor === 'black') { // if capitalist is black
        if (chessGame.board[targetX][targetY].chessPiece.pieceType === bPawn && !chessGame.board[targetX][targetY].chessPiece.isKing) { // if the piece is a Pawn of the right colour and is not an impostor King
            chessGame.board[targetX][targetY].chessPiece = new chessPiece(empty,'noColor'); // deletes the Pawn
            chessGame.black.goldBalance += 10; // adds 10 Gold
            return[0,`Worked Pawn at (${targetX.toString(16).toUpperCase()},${targetY.toString(16).toUpperCase()}) to death in the name of monetary gain.`];
        } else {
            return[6,'Must exploit a Pawn.'];
        };
    } else { // if capitalist is white
        if (chessGame.board[targetX][targetY].chessPiece.pieceType === wPawn && !chessGame.board[targetX][targetY].chessPiece.isKing) { // if the piece is a Pawn of the right colour and is not an impostor King
            chessGame.board[targetX][targetY].chessPiece = new chessPiece(empty,'noColor'); // deletes the Pawn
            chessGame.white.goldBalance += 10; // adds 10 Gold
            return[0,`Worked Pawn at (${targetX.toString(16).toUpperCase()},${targetY.toString(16).toUpperCase()}) to death in the name of monetary gain.`];
        } else {
            return[6,'Must exploit a Pawn.'];
        };
    };
};
specialMoveCatapult = (x,y,chessGame,playerColor,targetX,targetY) => {
    var direction;
    if (playerColor === 'black') { // if trebuchet is black
        direction = 1; // corresponds to throwing downwards
    } else { // if trebuchet is white
        direction = -1; // corresponds to throwing upwards
    };
    const chessPieceToCatapult = chessGame.board[x][y-direction].chessPiece;
    if (chessPieceToCatapult.color === 'noColor') { // if there is nothing there
        return [6, 'Nothing there to catapult.'];
    } else if (chessPieceToCatapult.pieceType.pieceClass === 'Structure' || chessGame.board[x][y-direction].chessPiece.pieceType === keep || chessGame.board[x][y-direction].chessPiece.pieceType === embassy) { // if the piece is a Structure (including a Keep or Embassy)
        return [6, `${chessPieceToCatapult.pieceType.fullName} is too heavy to catapult.`];
    } else if (x != targetX) { // if the target is not directly forwards
        return [6, 'Can only catapult directly forwards.'];
    } else if (chessGame.board[targetX][targetY].chessPiece.pieceType != empty) { // if target square is occupied
        return [6, `${chessGame.board[targetX][targetY].chessPiece.pieceType.fullName} is in the way.`];
    } else if ((direction === 1 && targetY < 3) || (direction === -1 && targetY > 12)) { // if catapulting in the wrong direction
        return [6, `Can only catapult forwards.`];
    } else { // checking for barriers in the way
        for (var i = 0; i < targetY - 2; i++) {
            if (chessGame.board[x][y+(i*direction)].chessPiece.pieceType === barrier) {
                return [6, 'Cannot catapult over Barriers.'];
            };
        };
        chessGame.board[targetX][targetY].chessPiece = chessPieceToCatapult; // moves piece
        chessGame.board[x][y-direction].chessPiece = new chessPiece(empty,'noColor'); // deletes where piece used to be
        return [0, `Catapulted ${chessPieceToCatapult.pieceType.fullName} to (${targetX.toString(16).toUpperCase()},${targetY.toString(16).toUpperCase()}).`]
    };
};
specialMoveSummon = (x,y,chessGame,playerColor,targetX,targetY) => { // PLEASE NOTE IMPLEMENTATION OF TREBUCHET IS VERY JANKY AND IT ONLY WORKS IF ITS ON THE SECOND RANK ATM
    if (Math.abs(targetX-x) > 2 || Math.abs(targetY-y) > 2) { // if outside of a 5x5 square
        return[6,'Too far away to summon.'];
    } else if (chessGame.board[targetX][targetY].chessPiece.color != 'noColor') { // if space to summon is occupied
        return[6,`${chessGame.board[targetX][targetY].chessPiece.pieceType.fullName} is in the way.`];
    } else { // if piece can be summoned
        const pieceLootTable = [ // index 0 pieceType, index 1 weight
        [vicar,      15],
        [alchemist,  3 ],
        [evoker,     6 ],
        [weeds,      10],
        [bomb,       5 ],
        [queen,      1 ],
        [firework,   3 ],
        [henryBot,   1 ],
        [priest,     5 ],
        [jesusPhase1,2 ],
        ];
        const chosenPieceType = rollPieceLootTable(pieceLootTable);
        chessGame.board[targetX][targetY].chessPiece = new chessPiece(chosenPieceType,playerColor);
        return [0,`Summoned ${chosenPieceType.fullName} at (${targetX.toString(16).toUpperCase()},${targetY.toString(16).toUpperCase()}).`];
    };
};
specialMoveSummonAnimal = (x,y,chessGame,playerColor,targetX,targetY) => {
    if (Math.abs(targetX-x) > 2 || Math.abs(targetY-y) > 2) { // if outside of a 5x5 square
        return[6,'Too far away to summon.'];
    } else if (chessGame.board[targetX][targetY].chessPiece.color != 'noColor') { // if space to summon is occupied
        return[6,`${chessGame.board[targetX][targetY].chessPiece.pieceType.fullName} is in the way.`];
    } else { // if piece can be summoned
        const pieceLootTable = [ // index 0 pieceType, index 1 weight
        [fish,  1 ], 
        [cat,   10],
        [crab,  8 ],
        [mole,  9 ],
        [squid, 6 ],
        [pig,   3 ],
        [knight,3 ],
        ];
        const chosenPieceType = rollPieceLootTable(pieceLootTable);
        chessGame.board[targetX][targetY].chessPiece = new chessPiece(chosenPieceType,playerColor);
        return [0,`Summoned ${chosenPieceType.fullName} at (${targetX.toString(16).toUpperCase()},${targetY.toString(16).toUpperCase()}).`];
    };
};
specialMoveDistraction = (x,y,chessGame) => {
    chessGame.board[x][y].chessPiece = new chessPiece(empty,'noColor');
    chessGame.turnsToSkip += 2;
    return [0,`Set off Firework at (${x.toString(16).toUpperCase()},${y.toString(16).toUpperCase()}).`]; 
};
specialMoveConvertGrayPiece = (x,y,chessGame,playerColor,targetX,targetY) => {
    const chessPieceToConvert = chessGame.board[targetX][targetY].chessPiece;
    if (Math.abs(x-targetX) > 1 || Math.abs(y-targetY) > 1) { // if targeting too far away
        return [6,'Too far away to convert.'];
    } else if (chessPieceToConvert.color != 'gray') { // if not targeting a Grey Pawn
        return [6, 'Must convert a Grey Pawn.'];
    } else {
        if (chessPieceToConvert.pieceType === gPawn) { // if it is a Pawn which is to be converted
            if (playerColor === 'black') {
                chessGame.board[targetX][targetY].chessPiece = new chessPiece(bPawn,'black');
            } else {
                chessGame.board[targetX][targetY].chessPiece = new chessPiece(wPawn,'white');
            };
        } else { // if it's not a Pawn
            chessGame.board[targetX][targetY].chessPiece.color = playerColor;
        };
        return [0,`Converted ${chessPieceToConvert.pieceType.fullName} at (${targetX.toString(16).toUpperCase()},${targetY.toString(16).toUpperCase()}).`]
    };
};
specialMoveSwapKing = (x,y,chessGame,playerColor,targetX,targetY) => {
    if (!((playerColor === 'black' && chessGame.board[targetX][targetY].chessPiece.pieceType === bPawn) || (playerColor === 'black' && chessGame.board[targetX][targetY].chessPiece.pieceType === wPawn))) {
        return [1,'King can only Swap with a Pawn.']
    };
    // if swap attempt is successful
    for (var i = 0; i < 16; i++) {
        for (var j = 0; j < 16; j++) {
            if (chessGame.board[i][j].chessPiece.color === playerColor) { // only looking at pieces of the current Trickster's colour
                chessGame.board[i][j].chessPiece.isKing = false; // resetting kingliness of all pieces of that color
                if (chessGame.board[i][j].chessPiece.pieceType === king) { // if replacing the original King
                    chessGame.board[i][j].chessPiece = new chessPiece(impostorKing,playerColor);
                };
            };
        };
    };
    chessGame.board[targetX][targetY].chessPiece.isKing = true;
    return [0,'King has been swapped. Don\'t tell anyone!'];
};
specialMoveSetTrap = (x,y,chessGame,playerColor,targetX,targetY) => {
    if (Math.abs(targetX-x) > 1 || Math.abs(targetY-y) > 1) { // if out of range
        return[6,'Cannot set a trap that far away.'];
    } else if (chessGame.board[targetX][targetY].chessPiece.color != 'noColor') { // if setting trap in occupied space
        return[6,'Cannot set a trap in an occupied space.'];
    } else {
        chessGame.board[targetX][targetY].trapPiece = playerColor; // sets a trap of the saboteur's color
        return[0,'A trap was set.'];
    };
};
specialMoveSummonCat = (x,y,chessGame,playerColor,targetX,targetY) => {
    if (Math.abs(targetX-x) > 1 || Math.abs(targetY-y) > 1) { // if out of range
        return[6,'Cannot summon a Cat that far away.'];
    } else if (chessGame.board[targetX][targetY].chessPiece.color != 'noColor') { // if setting trap in occupied space
        return[6,'Cannot summon a Cat in an occupied space.'];
    } else {
        chessGame.board[targetX][targetY].chessPiece = new chessPiece(cat,playerColor); // sets a trap of the saboteur's color
        return[0,`Summoned Cat at (${targetX.toString(16).toUpperCase()},${targetY.toString(16).toUpperCase()}).`];
    };
};
specialMoveSacrifice = (x,y,chessGame,playerColor,targetX,targetY) => {
    var shouldCheckEmbassies = false;
    const sacrificedPiece = chessGame.board[targetX][targetY].chessPiece;
    if (sacrificedPiece.color != playerColor) {
        return[6,'No piece there to sacrifice.'];
    };
    if (sacrificedPiece.isKing) {
        return[6,'Cannot sacrifice the King!'];
    };
    if(targetX === x && targetY === y) {
        return[6,'Priest cannot sacrifice itself.'];
    };
    var returnMessage = `Sacrificed ${sacrificedPiece.pieceType.fullName} at (${targetX.toString(16).toUpperCase()},${targetY.toString(16).toUpperCase()}).`;
    chessGame.board[targetX][targetY].chessPiece = new chessPiece (empty,'noColor'); // delete the piece
    if (sacrificedPiece.pieceType === mine) { // checking for mines
        chessGame[sacrificedPiece.color].mineCount -= 1;
    } else if (sacrificedPiece.pieceType === embassy) { // checking for embassies
        shouldCheckEmbassies = true;
    };
    chessGame[playerColor].soulBalance += 1; // add a soul to the respective player
    switch (chessGame[playerColor].soulBalance) {
        case 5: { // if this is their fifth sacrifice
            returnMessage += `\n\u2022 The Gods are pleased with the sacrifices, and have awarded greath wealth.`
            chessGame[playerColor].goldBalance += 20; // adds 20 gold to respective player
            break;
        } case 10: { // if this is their tenth sacrifice
            returnMessage += `\n\u2022 The Gods continue to be pleased with the sacrifices, and have awarded even more Gold.`
            chessGame[playerColor].goldBalance += 30; // adds 30 gold to respective player
            break;
        } case 20:{ // if this is their twentieth sacrifice
            returnMessage += `\n\u2022 The Gods are delighted with the sacrifices. They have bestowed the Priest with great powers.`;
            chessGame.board[x][y].chessPiece = new chessPiece(mechaPriest,playerColor);
            break;
        };
    };
    return[0,returnMessage,shouldCheckEmbassies]; // index 2 corresponds to boolean if embassies should be checked
};
specialMoveHack = (x,y,chessGame,playerColor) => {
    chessGame[playerColor].goldBalance += 5; // adds 5 gold to respective player
    return[0,'Hacked in 5 Gold.'];
};
specialMoveDestroyPiece = (x,y,chessGame,playerColor,targetX,targetY) => {
    var shouldCheckEmbassies = false;
    const pieceToObliterate = chessGame.board[targetX][targetY].chessPiece;
    if (pieceToObliterate.pieceType === empty) {
        return[6,'Nothing there to obliterate.'];
    };
    if (pieceToObliterate.isKing) {
        return[6,'Cannot obliterate a King.'];
    };
    chessGame.board[x][y].chessPiece = new chessPiece(empty,'noColor'); // removes original mecha priest
    switch (pieceToObliterate.pieceType.id) { // if a special piece is destroyed
        case 'mine': {
            chessGame[chessGame.board[targetX][targetY].chessPiece.color].mineCount -= 1; // removes one mine count from corresponding player
            break;
        } case 'embassy': {
            shouldCheckEmbassies = true;
            break;
        };
    };
    chessGame.board[targetX][targetY].chessPiece = new chessPiece(mechaPriest,playerColor);
    return[0,`Obliterated ${pieceToObliterate.pieceType.fullName} at (${targetX.toString(16).toUpperCase()},${targetY.toString(16).toUpperCase()}).`,shouldCheckEmbassies]
};
specialMoveBuildRook = (x,y,chessGame,playerColor,targetX,targetY) => {
    if (Math.abs(targetX-x) > 1 || Math.abs(targetY-y) > 1) { // if out of range
        return[6,'Cannot build a Rook that far away.'];
    } else if (chessGame.board[targetX][targetY].chessPiece.color != 'noColor') { // if setting trap in occupied space
        return[6,'Cannot build a Rook in an occupied space.'];
    } else {
        chessGame.board[targetX][targetY].chessPiece = new chessPiece(rook,playerColor); // sets a trap of the saboteur's color
        return[0,`Built Rook at (${targetX.toString(16).toUpperCase()},${targetY.toString(16).toUpperCase()}).`];
    };
};
specialMoveBuildMine = (x,y,chessGame,playerColor,targetX,targetY) => {
    if (Math.abs(targetX-x) > 1 || Math.abs(targetY-y) > 1) { // if out of range
        return[6,'Cannot build a Mine that far away.'];
    } else if (chessGame.board[targetX][targetY].chessPiece.color != 'noColor') { // if setting trap in occupied space
        return[6,'Cannot build a Mine in an occupied space.'];
    } else {
        chessGame.board[targetX][targetY].chessPiece = new chessPiece(mine,playerColor); // sets a trap of the saboteur's color
        chessGame[playerColor].mineCount += 1; // adds one mine to the count of respective player
        return[0,`Built Mine at (${targetX.toString(16).toUpperCase()},${targetY.toString(16).toUpperCase()}).`];
    };
};
specialMoveSetRespawn = (x,y,chessGame,playerColor,targetX,targetY) => {
    if (chessGame.board[targetX][targetY].chessPiece.pieceType != empty) {
        return[6,`Can only set respawn point in an empty square.`]
    };
    chessGame.board[targetX][targetY].chessPiece = new chessPiece(egg,playerColor); // sets respawn point
    chessGame.board[x][y].chessPiece = new chessPiece(jesusPhase2,playerColor); // upgrades the Jesus
    chessGame.board[x][y].chessPiece.respawnPointX = targetX; // defines where the Jesus should respawn from
    chessGame.board[x][y].chessPiece.respawnPointY = targetY; // ditto
    return[0,`Set resurrection point at (${targetX.toString(16).toUpperCase()},${targetY.toString(16).toUpperCase()}).`]
};
specialMoveSummonFish = (x,y,chessGame,playerColor) => {
    for (var i = 0; i < 16; i++) {
        for (var j = 0; j < 16; j++) {
            if (chessGame.board[i][j].chessPiece.pieceType === empty && Math.random() > 0.9) { // 10% chance
                chessGame.board[i][j].chessPiece = new chessPiece(fish,playerColor); // summons a fish
            };
        };
    };
    return[0,'Performed a miracle.']
};
specialMoveShoot = (x,y,chessGame,playerColor,targetX,targetY) => {
    const shouldCheckEmbassies = false;
    const pieceToShoot = chessGame.board[targetX][targetY].chessPiece
    switch (pieceToShoot.color) { // check what's at the target square
        case 'noColor': { // nobody there
            return[6,'Nothing there to shoot.'];
        } case playerColor: { // piece same colour as archer there
            return[6,'Can\'t shoot your own piece.'];
        };
    };
    if (inMSQueen(targetX-x,targetY-y,x,y,chessGame.board)) { // if can shoot like that 
        var returnMessage = `Shot ${pieceToShoot.pieceType.fullName} at (${targetX.toString(16).toUpperCase()},${targetY.toString(16).toUpperCase()}).`;
        chessGame.board[targetX][targetY].chessPiece = new chessPiece(empty,'noColor'); // deletes the piece
        switch (pieceToShoot.pieceType) { // if a special piece gets shot
            case embassy: { 
                shouldCheckEmbassies = true;
                break;
            } case mine: {
                chessGame.board[pieceToShoot.color].mineCount -= 1; // removes one mine count from corresponding player
                break;
            };
        };
        if (pieceToShoot.isKing) { // if the King was shot
            returnMessage += `\n\u2022 You win.`;
            return[1,returnMessage,shouldCheckEmbassies]; // index 2 corresponds to if checkEmbassies() will be run
        } else {// if it was not the King which was shot 
            return[0,returnMessage,shouldCheckEmbassies]; // index 2 corresponds to if checkEmbassies() will be run
        };
    } else { // if can't shoot like that (either there's a piece in the way or it's on a wrong axis)
        return[6,'Can\'t shoot like that.']; 
    };
};
specialMoveForfeit = () => {
    return[1,'King abdicated. Game lost.'];
};
specialMoveInk = (x,y,chessGame,playerColor,targetX,targetY) => {
    if (Math.abs(targetX-x) > 2 || Math.abs(targetY-y) > 2) { // if outside of a 5x5 square
        return[6,'Too far away to ink.'];
    };
    if (chessGame.board[targetX][targetY].isInked) { // if square already inked
        return[6,'That square is already inked.'];
    } else {
        chessGame.board[targetX][targetY].isInked = true;
        return[0,`Inked square (${targetX.toString(16).toUpperCase()},${targetY.toString(16).toUpperCase()})`];
    };
};
specialMoveShootMortar = (x,y,chessGame,playerColor,targetX,targetY) => {
    const shouldCheckEmbassies = false;
    const pieceToShoot = chessGame.board[targetX][targetY].chessPiece
    switch (pieceToShoot.color) { // check what's at the target square
        case 'noColor': { // nobody there
            return[6,'Nothing there to shoot.'];
        } case playerColor: { // piece same colour as archer there
            return[6,'Can\'t shoot your own piece.'];
        };
    };
    if (Math.abs(targetX-x) < 4 && Math.abs(targetY-y) < 4) { // if can shoot like that 
        var returnMessage = `Shot ${pieceToShoot.pieceType.fullName} at (${targetX.toString(16).toUpperCase()},${targetY.toString(16).toUpperCase()}).`;
        chessGame.board[targetX][targetY].chessPiece = new chessPiece(empty,'noColor'); // deletes the piece
        switch (pieceToShoot.pieceType) { // if a special piece gets shot
            case embassy: { 
                shouldCheckEmbassies = true;
                break;
            } case mine: {
                chessGame.board[pieceToShoot.color].mineCount -= 1; // removes one mine count from corresponding player
                break;
            };
        };
        if (pieceToShoot.isKing) { // if the King was shot
            returnMessage += `\n\u2022 You win.`;
            return[1,returnMessage,shouldCheckEmbassies]; // index 2 corresponds to if checkEmbassies() will be run
        } else {// if it was not the King which was shot 
            return[0,returnMessage,shouldCheckEmbassies]; // index 2 corresponds to if checkEmbassies() will be run
        };
    } else { // if can't shoot like that (either there's a piece in the way or it's on a wrong axis)
        return[6,'Can\'t shoot like that.']; 
    };
};

// DEFINING PIECES
const pieceTypesDirectory = fs.readdirSync('./assets/chess2/piecetype') // get the folder containing all the pieceTypes
pieceTypesDirectory.forEach((pieceTypeFile) =>  { // iterates through each file in folder
    const pieceTypeFileObject = JSON.parse(fs.readFileSync(`./assets/chess2/piecetype/${pieceTypeFile}`), function(key, value) { // function tells program how to convert from stringified functions back into function reference
        if (typeof value === 'string' && value.startsWith('FUNCTION/')) {
            // copied this bit off the internet so let's hope it works
            return (global[value.substring(9)]); // sets the property as the global function of that name
        } else { // if it's not a function
            return value;
        }
    });
    global[pieceTypeFileObject.id] = pieceTypeFileObject; // declare a new global variable with the contents of that file
});
//

function setUpGame(chessGame, boardSetupFileName) { // setting up, yes I'm well aware of how scuffed it is to have this as a separate function and not a method
    boardFile = JSON.parse(fs.readFileSync(`./assets/chess2/board/${boardSetupFileName}.c2b`)); // open selected file
    for (var i = 0; i < 16; i++) {
        for (var j = 0; j < 16; j++) {
            const boardEntry = boardFile[i][j];
            chessGame.board[i][j].chessPiece = new chessPiece(global[(boardEntry[0])],boardEntry[1]); // assign position on board as dictated in the file
            if (boardEntry[0] === 'king') { // if a King is being placed
                chessGame.board[i][j].chessPiece.isKing = true;
            };
        };
    };
    chessGame = chessGame.checkEmbassies().checkMines();

    // very Special Conditions (might remove this for source code release)
    if (boardSetupFileName = 'default') {
        if (chessGame.white.id === '688072041001254984') {
            const whiteGeorgiePiece = new chessPiece(georgie,'white');
            chessGame.board[1 ][15].chessPiece = whiteGeorgiePiece;
            chessGame.board[6 ][15].chessPiece = whiteGeorgiePiece;
            chessGame.board[9 ][15].chessPiece = whiteGeorgiePiece;
            chessGame.board[14][15].chessPiece = whiteGeorgiePiece;
        } else if (chessGame.black.id === '688072041001254984') {
            const blackGeorgiePiece = new chessPiece(georgie,'black');
            chessGame.board[1 ][0 ].chessPiece = blackGeorgiePiece;
            chessGame.board[6 ][0 ].chessPiece = blackGeorgiePiece;
            chessGame.board[9 ][0 ].chessPiece = blackGeorgiePiece;
            chessGame.board[14][0 ].chessPiece = blackGeorgiePiece;
        };
    };
    //

    return chessGame;
};
function rollPieceLootTable(pieceLootTable) { // choosing a random piece from a weighted list
    // not gonna explain this function you can figure it out yourselves
    var totalWeights = 0;
    for (var i =0; i < pieceLootTable.length; i++) {
        totalWeights += pieceLootTable[i][1];
    };
    var roll = Math.floor(Math.random() * totalWeights);
    var chosenPieceType;
    var checkedWeights = 0;
    for (var i = 0; i < pieceLootTable.length; i++) {
        if (roll < pieceLootTable[i][1] + checkedWeights) {
            chosenPieceType = pieceLootTable[i][0];
            break;
        } else {
            checkedWeights += pieceLootTable[i][1];
        };
    };
    return chosenPieceType;
};

// export all classes
module.exports = {
    chessGame: chessGame,
    chessSquare: chessSquare,
    chessPiece: chessPiece,
    pieceType: pieceType,
};

// export functions
module.exports.setUpGame = setUpGame;

// author's comments (that's me i'm the author)
// bunch of the specialMove and inMS functions are lowkey scuffed, might redo them and im definetely gonna plonk them in their own separate files probably idk