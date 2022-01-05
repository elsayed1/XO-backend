const http = require("http");
const express = require("express");
const socketIO = require("socket.io");
var cors = require("cors");

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
app.use(cors({ origin: "*" }));

const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

server.listen(PORT, () => {
  console.log("server started and listening on port " + PORT);
});

app.get("/", (req, res) => {
  res.end("Hello");
});

const boardInitial = [
  ["", "", ""],
  ["", "", ""],
  ["", "", ""],
];

const rooms = new Map();
const getWhoStart = (player1, player2) =>
  Math.round(Math.random()) ? player1 : player2;

const checkWinner = (board) => {
  const winComb = ["012", "345", "678", "036", "147", "258"];
  const flatBoard = board.flat();

  const winnerComb = winComb.find((comb) => {
    return comb
      .split("")
      .reduce(
        (prev, current) =>
          flatBoard[prev] === flatBoard[current] ? current : false,
        comb[0]
      );
  });

  if (winnerComb) return flatBoard[winnerComb[0]];
  return false;
};

io.on("connection", (socket) => {
  console.log(io.sockets.sockets.size);
  // Create a new game room and notify the creator of game.
  socket.on("create room", (player1) => {
    const roomName = `room${++rooms.size}`;

    socket.join(roomName);
    rooms.set(roomName, { player1 });

    socket.emit("room created", {
      player1,
      roomName,
    });
    // console.log(io.nsps["/"].adapter.rooms[`room1`].sockets)
    //console.log(io.sockets.connected[socket.id].player)
  });

  // Connect the Player 2 to the room he requested. Show error if room full.
  socket.on("join room", async ({ roomName, player2 }) => {
    const sockets = await io.in(roomName).fetchSockets();
    if (sockets.length === 1) {
      socket.join(roomName);
      const { player1 } = rooms.get(roomName);

      rooms.set(roomName, { player1, player2 });
      io.to(roomName).emit("player2 joined", { player2, player1, roomName });
    } else {
      socket.emit("err", {
        message: "Sorry, The room is full!",
      });
    }
  });

  socket.on("initNewGame", async ({ roomName }) => {
    const { player1, player2 } = rooms.get(roomName);
    const game = {
      player1,
      board: JSON.parse(JSON.stringify(boardInitial)),
      player2,
      playerTurn: getWhoStart(player1, player2),
    };
    rooms.set(roomName, game);
    io.to(roomName).emit("newGameStarted", game);
  });

  
  // Handle the turn played by either player and notify the other.
  socket.on("playTurn", ({ roomName, tile }) => {
    console.log(tile);
    const { board, playerTurn, player1, player2 } = rooms.get(roomName) || {};
    board[tile.r][tile.c] = playerTurn === player1 ? "X" : "O";
    rooms.set(roomName, {
      board,
      playerTurn: playerTurn === player1 ? player2 : player1,
      player1,
      player2,
    });
    io.to(roomName).emit("turnPlayed", rooms.get(roomName));
    const getWinnerPlayer= (winner)=>{
      if(!winner)
      return null;
      return winner === 'X' ?player1:player2
    }
    const winner = checkWinner(board);
    if (winner) return io.to(roomName).emit("gameOver", {winner:getWinnerPlayer(winner)});

    if(board.flat().filter(Boolean).length === boardInitial.flat().length)
    return io.to(roomName).emit("gameOver", {winner :winner});
  });

  /**
   * Notify the players about the victor.
   */
  socket.on("gameEnded", (data) => {
    socket.broadcast.to(data.room).emit("gameEnd", data);
  });
});
