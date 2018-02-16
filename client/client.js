/* eslint-env browser */
/* global io */
/* eslint no-bitwise: ["error", { "allow": ["|=","<<","&"] }] */
// previous comments are to set up eslint for browser use
// I wanted to eslint the browser code for my own sanity
// also i *needed* bitwise


const players = [];

const P_SIZE = 20;
const MAZE_SQUARE_SIZE = 30;
const MAZE_PAD = (MAZE_SQUARE_SIZE - P_SIZE) / 2;


const LEFT = 0;
const UP = 1;
const RIGHT = 2;
const DOWN = 3;

const mazeCanvas = document.createElement('canvas');
const mazeCtx = mazeCanvas.getContext('2d');

// left,  up,    right,  down
const move = [false, false, false, false];

let playerNum = -1;

let maze;

let helpTextTag;

let tryWin = false;
let gameRunning = false;
// const ready = false;

const onLose = (sock) => {
  const socket = sock;

  socket.on('lose', (data) => {
    helpTextTag.innerHTML = `YOU LOST TO PLAYER ${data.winner}!! :c`;
    helpTextTag.style.color = 'red';
    gameRunning = false;
  });
};

const onWin = (sock) => {
  const socket = sock;

  socket.on('win', () => {
    helpTextTag.innerHTML = 'YOU WON!!';
    helpTextTag.style.color = 'blue';
    gameRunning = false;
  });
};

const updatePlayer = (number, data) => {
  const player = players[number];


  // TODO could lerp here
  player.x = data.x;
  player.y = data.y;
};

const onMove = (sock) => {
  const socket = sock;

  socket.on('move', (data) => {
    if (gameRunning) { updatePlayer(data.playerPos, data); }
  });
};

const addPlayer = (number) => {
  players[number] = {
    x: 0,
    y: 0,
    width: P_SIZE,
    height: P_SIZE,
  };


  // sets up corners
  if (number > 2) {
    players[number].y = maze.length - 1;
  }
  if (number === 1 || number === 3) {
    players[number].x = maze[0].length - 1;
  }
};

// Updates position, returns true if player is now in win spot
const updatePosition = () => {
  const me = players[playerNum];
  const mazePos = maze[me.y][me.x];


  // loops through all possible directions to move
  // exits loop if one direction is true
  // order is defined by the UP, DOWN, LEFT, RIGHT globals
  for (let i = 0; i < 4; i++) {
    if (move[i]) {
      // shifts bit over by i, then ands bits with 1
      // checks if the bit for this direction is set to 1
      // bit meaning 1:L 2:U 4:R 8:D
      if (((mazePos << i) & 1) === 1) {
        switch (i) {
          case 0:
            me.x--;
            break;
          case 1:
            me.y--;
            break;
          case 2:
            me.x++;
            break;
          default:
            me.y++;
            break;
        }
        break;
      }
    }
  }

  if (maze[me.y][me.x] < 0) {
    return true;
  }
  return false;
};

const drawPlayer = (player, ctx, color) => {
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(
    (player.x * MAZE_SQUARE_SIZE) + (MAZE_PAD),
    (player.y * MAZE_SQUARE_SIZE) + (MAZE_PAD),
    P_SIZE,
    P_SIZE,
  );
  ctx.restore();
};


// draws the maze to the mazeCtx
const drawMaze = () => {
  mazeCtx.fillStyle = 'black';
  mazeCtx.fillRect(0, 0, mazeCanvas.width, mazeCanvas.height);
  mazeCtx.fillStyle = 'white';

  let xPos = 0;
  let yPos = 0;

  for (let y = 0; y < maze.length; y++) {
    for (let x = 0; x < maze[y].length; x++) {
      mazeCtx.fillRect(x + MAZE_PAD, y + MAZE_PAD, P_SIZE, P_SIZE);
      const mazePos = maze[y][x];
      for (let i = 0; i < 4; i++) {
        // shifts bit over by i, then ands bits with 1
        // checks if the bit for this direction is set to 1
        // if so, draws a rect in that direction for the maze
        // bit meaning 1:L 2:U 4:R 8:D
        if (((mazePos << i) & 1) === 1) {
          switch (i) {
            case 0:
              mazeCtx.fillRect(xPos, yPos + MAZE_PAD, MAZE_PAD, P_SIZE);
              break;
            case 1:
              mazeCtx.fillRect(xPos + MAZE_PAD, yPos, P_SIZE, MAZE_PAD);
              break;
            case 2:
              mazeCtx.fillRect(xPos + P_SIZE + MAZE_PAD, yPos + MAZE_PAD, MAZE_PAD, P_SIZE);
              break;
            default:
              mazeCtx.fillRect(xPos + MAZE_PAD, yPos + P_SIZE + MAZE_PAD, P_SIZE, MAZE_PAD);
              break;
          }
        }
      }
      xPos += MAZE_SQUARE_SIZE;
    }
    yPos += MAZE_SQUARE_SIZE;
  }
};

const redraw = (time, socket, canvas, ctx) => {
  if (!tryWin) {
    tryWin = updatePosition(canvas);
    if (tryWin) {
      socket.emit('win', players[playerNum]);
    } else {
      socket.emit('move', players[playerNum]);
    }
  }


  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(mazeCanvas, 0, 0);

  for (let i = 0; i < players.length; i++) {
    if (i !== playerNum) {
      drawPlayer(i, ctx, 'red');
    }
  }
  // draw us on top
  drawPlayer(playerNum, ctx, 'blue');

  requestAnimationFrame(t => redraw(t, socket, canvas, ctx));
};

const onJoin = (sock, canvas) => {
  const socket = sock;

  socket.on('join', (data) => {
    playerNum = data.player;

    ({ maze } = data);
    console.dir(data.maze);
    console.dir(maze);
    addPlayer(playerNum, canvas);
    drawMaze();

    // TODO add ready button

    requestAnimationFrame(time => redraw(time, socket, canvas, canvas.getContext('2d')));
  });
};

const onFull = (sock) => {
  const socket = sock;

  socket.on('full', () => {
    // TODO something about how you didn't join, idk, not important right now
  });
};


const keyDownHandler = (e) => {
  const keyPressed = e.which;
  if (keyPressed === 87 || keyPressed === 38) {
    move[UP] = true;
  } else if (keyPressed === 65 || keyPressed === 37) {
    move[LEFT] = true;
  } else if (keyPressed === 83 || keyPressed === 40) {
    move[DOWN] = true;
  } else if (keyPressed === 68 || keyPressed === 39) {
    move[RIGHT] = true;
  }
  if (move[UP] || move[LEFT] || move[DOWN] || move[RIGHT]) {
    e.preventDefault();
  }
};

const keyUpHandler = (e) => {
  const keyPressed = e.which;
  if (keyPressed === 87 || keyPressed === 38) {
    move[UP] = false;
  } else if (keyPressed === 65 || keyPressed === 37) {
    move[LEFT] = false;
  } else if (keyPressed === 83 || keyPressed === 40) {
    move[DOWN] = false;
  } else if (keyPressed === 68 || keyPressed === 39) {
    move[RIGHT] = false;
  }
};

const init = () => {
  console.log('loading...');
  const canvas = document.querySelector('canvas');
  canvas.width = 500;
  canvas.height = 500;
  canvas.style.border = '1px solid blue';

  helpTextTag = document.querySelector('#helpText');

  const socket = io.connect();

  socket.on('connect', () => {
    onJoin(socket, canvas);
    onFull(socket);
    onMove(socket);
    onWin(socket);
    onLose(socket);
  });


  document.body.addEventListener('keydown', keyDownHandler);
  document.body.addEventListener('keyup', keyUpHandler);
};

window.onload = init;