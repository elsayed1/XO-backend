// const express = require("express");
// const app = express();
// const port = process.env.PORT || 3000;
// const server = app.listen(port, () => console.log("server is runnig on port" + port));

// const io = require("socket.io")(server);

const http = require("http");
const express = require("express");
const socketIO = require("socket.io");

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);

const io = socketIO(server);

server.listen(PORT, () => {
  console.log("server started and listening on port " + PORT);
});

app.get("/", (req, res) => {
  res.end("Hello");
});
let rooms = 0;

io.on("connection", (socket) => {
  console.log("user connected ", socket.id);

  // Create a new game room and notify the creator of game.
  socket.on("create room", (player1) => {
    socket.join(`room${++rooms}`);
    socket.emit("room created", {
      player1,
      roomName: `room${rooms}`,
    });
    socket.player = player1;
    // console.log(io.nsps["/"].adapter.rooms[`room1`].sockets)
    //console.log(io.sockets.connected[socket.id].player)
  });

  // Connect the Player 2 to the room he requested. Show error if room full.
  socket.on("join room", ({ roomName, player2 }) => {
    var room = io.sockets.adapter.rooms.get(roomName);
    if (room && room.size >= 1) {

      socket.join(roomName);
      io.to(roomName).emit("player2 joined", { player2,roomName });
    } else {
      socket.emit("err", {
        message: "Sorry, The room is full!",
      });
    }
  });

  // return the player1 name to the player2
  socket.on("cast player1", ({ roomName,player1 }) => {
    console.log(player1)
    io.to(roomName).emit("player1 name", { player1 });
  });

  // Handle the turn played by either player and notify the other.
  socket.on("playTurn", (data) => {
    socket.broadcast.to(data.room).emit("turnPlayed", {
      tile: data.tile,
      room: data.room,
    });
  });

  /**
   * Notify the players about the victor.
   */
  socket.on("gameEnded", (data) => {
    socket.broadcast.to(data.room).emit("gameEnd", data);
  });
});
