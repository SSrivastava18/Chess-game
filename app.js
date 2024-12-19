const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();

const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {}; // Track players
let currentPlayer = "w"; // Start with white

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index", { title: "Chess Game" });
});

io.on("connection", function (uniquesocket) {
    console.log("New connection:", uniquesocket.id);

    // Assign player roles
    if (!players.white) {
        players.white = uniquesocket.id;
        uniquesocket.emit("playerRole", "w");
    } else if (!players.black) {
        players.black = uniquesocket.id;
        uniquesocket.emit("playerRole", "b");
    } else {
        uniquesocket.emit("spectatorRole");
    }

    // Handle player disconnection
    uniquesocket.on("disconnect", function () {
        console.log("Disconnected:", uniquesocket.id);
        if (uniquesocket.id === players.white) {
            delete players.white;
        } else if (uniquesocket.id === players.black) {
            delete players.black;
        }
        io.emit("playerDisconnected", { white: players.white, black: players.black });
    });

    // Handle moves
    uniquesocket.on("move", (move) => {
        try {
            // Validate player's turn
            if (chess.turn() === "w" && uniquesocket.id !== players.white) return;
            if (chess.turn() === "b" && uniquesocket.id !== players.black) return;

            const result = chess.move(move);
            if (result) {
                currentPlayer = chess.turn(); // Update current player
                io.emit("move", move); // Broadcast move
                io.emit("boardState", chess.fen()); // Broadcast board state
            } else {
                console.log("Invalid move:", move);
                uniquesocket.emit("invalidMove", move); // Notify the player of the invalid move
            }
        } catch (err) {
            console.log("Error processing move:", err);
            uniquesocket.emit("error", "Invalid move format.");
        }
    });
});

server.listen(3000, function () {
    console.log("Listening on http://localhost:3000");
});
