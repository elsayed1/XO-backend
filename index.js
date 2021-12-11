const express = require("express");
const app = express();
const server = require("http").Server(app);

const io = require("socket.io")(server);

app.get("/", (req, res) => {
  res.end("Hello");
});
let rooms = 0;

io.on("connection", socket => {
  console.log("user connected ", socket.id);
  // Create a new game room and notify the creator of game.
  socket.on("create room", player1 => {
    socket.join(`room${++rooms}`);
    socket.emit("room created", {
      player1,
      roomName: `room${rooms}` 
    });
    socket.player=player1
    // console.log(io.nsps["/"].adapter.rooms[`room1`].sockets)
    //console.log(io.sockets.connected[socket.id].player)
  });

  // Connect the Player 2 to the room he requested. Show error if room full.
  socket.on("join room", ({roomName,player2}) => {
    var room = io.nsps["/"].adapter.rooms[roomName];
    if (room && room.length === 1) {
      socket.join(roomName);
      socket.broadcast
        .to(roomName)
        .emit("player2 joined", { player2 });
    } else {
      socket.emit("err", {
        message: "Sorry, The room is full!"
      });
    }
  });

  // return the player1 name to the player2
  socket.on("player1 name", ({ player1, roomName }) => {
    socket.broadcast.to(roomName).emit("player1 name", { player1 });
  });



  // Handle the turn played by either player and notify the other.
  socket.on("playTurn", data => {
    socket.broadcast.to(data.room).emit("turnPlayed", {
      tile: data.tile,
      room: data.room
    });
  });

  /**
   * Notify the players about the victor.
   */
  socket.on("gameEnded", data => {
    socket.broadcast.to(data.room).emit("gameEnd", data);
  });

});
const port = process.env.PORT || 3000;
server.listen(port, () => console.log("server is runnig on port" + port));
