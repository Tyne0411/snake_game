'use strict';
const Board = require('../configs/board');
const ServerConfig = require('../configs/server-config');

const AdminService = require('../services/admin-service');
const BoardOccupancyService = require('../services/board-occupancy-service');
const BotDirectionService = require('../services/bot-direction-service');
const ColorService = require('../services/color-service');
const CoordinateService = require('../services/coordinate-service');
const FoodService = require('../services/food-service');
const GameControlsService = require('../services/game-controls-service');
const ImageService = require('../services/image-service');
const NameService = require('../services/name-service');
const PlayerSpawnService = require('../services/player-spawn-service');
const ValidationService = require('../services/validation-service');

const Player = require('../models/player');
const PlayerStatBoard = require('../models/player-stat-board');

class GameController {

    constructor() {
        this.players = {};
        this.boardOccupancyService = new BoardOccupancyService();
        this.botDirectionService = new BotDirectionService(this.boardOccupancyService);
        this.playerSpawnService = new PlayerSpawnService(this.boardOccupancyService);
        this.colorService = new ColorService();
        this.nameService = new NameService();
        this.playerStatBoard = new PlayerStatBoard();
        this.foodService = new FoodService(this.playerStatBoard, this.boardOccupancyService,
            this.nameService, this.sendNotificationToPlayers.bind(this));
        this.imageService = new ImageService(this.players, this.playerStatBoard, this.sendNotificationToPlayers.bind(this));
        this.adminService = new AdminService(this.players, this.playerStatBoard, this.boardOccupancyService,
            this.colorService, this.foodService, this.nameService, this.playerSpawnService,
            this._disconnectPlayer.bind(this), this.sendNotificationToPlayers.bind(this));
    }

    listen(io) {
        this.io = io;
        this.imageService.setIo(this.io);
        const self = this;
        this.io.sockets.on(ServerConfig.IO.DEFAULT_CONNECTION, socket => {
            socket.on(ServerConfig.IO.INCOMING.NEW_PLAYER, self._addPlayer.bind(self, socket));
            socket.on(ServerConfig.IO.INCOMING.NAME_CHANGE, self._changePlayerName.bind(self, socket));
            socket.on(ServerConfig.IO.INCOMING.COLOR_CHANGE, self._changeColor.bind(self, socket));
            socket.on(ServerConfig.IO.INCOMING.KEY_DOWN, self._keyDown.bind(self, socket));
            socket.on(ServerConfig.IO.INCOMING.JOIN_GAME, self._playerJoinGame.bind(self, socket));
            socket.on(ServerConfig.IO.INCOMING.SPECTATE_GAME, self._playerSpectateGame.bind(self, socket));
            socket.on(ServerConfig.IO.INCOMING.DISCONNECT, self._disconnect.bind(self, socket));

            socket.on(ServerConfig.IO.INCOMING.CLEAR_UPLOADED_BACKGROUND_IMAGE,
                self.imageService.clearBackgroundImage.bind(self.imageService, socket));
            socket.on(ServerConfig.IO.INCOMING.BACKGROUND_IMAGE_UPLOAD,
                self.imageService.updateBackgroundImage.bind(self.imageService, socket));
            socket.on(ServerConfig.IO.INCOMING.CLEAR_UPLOADED_IMAGE,
                self.imageService.clearPlayerImage.bind(self.imageService, socket));
            socket.on(ServerConfig.IO.INCOMING.IMAGE_UPLOAD,
                self.imageService.updatePlayerImage.bind(self.imageService, socket));

            socket.on(ServerConfig.IO.INCOMING.BOT_CHANGE,
                self.adminService.changeBots.bind(self.adminService, socket));
            socket.on(ServerConfig.IO.INCOMING.FOOD_CHANGE,
                self.adminService.changeFood.bind(self.adminService, socket));
            socket.on(ServerConfig.IO.INCOMING.SPEED_CHANGE,
                self.adminService.changeSpeed.bind(self.adminService, socket));
            socket.on(ServerConfig.IO.INCOMING.START_LENGTH_CHANGE,
                self.adminService.changeStartLength.bind(self.adminService, socket));
        });
    }

    runGameCycle() {
        // Pause and reset the game if there aren't any players
        if (this._getNumberOfPlayers() - this.adminService.getBotNames().length === 0) {
            console.log('Game Paused');
            this.adminService.resetGame();
            this.imageService.resetGame();
            return;
        }

        for (const botName of this.adminService.getBotNames()) {
            const bot = this.players[botName];
            if (Math.random() <= ServerConfig.BOT_CHANGE_DIRECTION_PERCENT) {
                this.botDirectionService.changeToRandomDirection(bot);
            }
            this.botDirectionService.changeDirectionIfInDanger(bot);
        }

        const playersToRespawn = [];
        for (const playerId in this.players) {
            if ({}.hasOwnProperty.call(this.players, playerId)) {
                const player = this.players[playerId];
                // Check if player is spectating
                if (player.segments.length === 0) {
                    continue;
                }
                this.boardOccupancyService.removePlayerOccupancy(player.id, player.segments);
                CoordinateService.movePlayer(player);
                if (this.boardOccupancyService.isOutOfBounds(player.getHeadLocation()) ||
                        this.boardOccupancyService.isWall(player.getHeadLocation())) {
                    player.clearAllSegments();
                    playersToRespawn.push(player);
                } else {
                    this.boardOccupancyService.addPlayerOccupancy(player.id, player.segments);
                }
            }
        }

        const killReports = this.boardOccupancyService.getKillReports();
        for (const killReport of killReports) {
            if (killReport.isSingleKill()) {
                const victim = this.players[killReport.victimId];
                if (killReport.killerId === killReport.victimId) {
                    // TODO Display suicide announcement
                } else {
                    this.playerStatBoard.addKill(killReport.killerId);
                    this.playerStatBoard.increaseScore(killReport.killerId);
                    this.playerStatBoard.stealScore(killReport.killerId, victim.id);
                    // Steal victim's length
                    this.players[killReport.killerId].grow(victim.segments.length);
                    // TODO Display kill announcement
                }
                this.boardOccupancyService.removePlayerOccupancy(victim.id, victim.segments);
                victim.clearAllSegments();
                playersToRespawn.push(victim);
            } else {
                for (const victimId of killReport.victimIds) {
                    const victim = this.players[victimId];
                    this.boardOccupancyService.removePlayerOccupancy(victim.id, victim.segments);
                    victim.clearAllSegments();
                    playersToRespawn.push(victim);
                }
                // TODO Display multideath announcement
            }
        }

        for (const player of playersToRespawn) {
            this.respawnPlayer(player);
        }

        this.foodService.consumeAndRespawnFood(this.players);

        const gameData = {
            players: this.players,
            food: this.foodService.getFood(),
            playerStats: this.playerStatBoard,
            speed: this.adminService.getGameSpeed(),
            numberOfBots: this.adminService.getBotNames().length,
            startLength: this.adminService.getPlayerStartLength(),
        };
        this.io.sockets.emit(ServerConfig.IO.OUTGOING.NEW_STATE, gameData);

        setTimeout(this.runGameCycle.bind(this), 1000 / this.adminService.getGameSpeed());
    }

    respawnPlayer(player) {
        this.playerSpawnService.setupNewSpawn(player, this.adminService.getPlayerStartLength(),
            ServerConfig.SPAWN_TURN_LEEWAY);
        this.playerStatBoard.resetScore(player.id);
        this.playerStatBoard.addDeath(player.id);
    }

    sendNotificationToPlayers(notification, playerColor) {
        console.log(notification);
        this.io.sockets.emit(ServerConfig.IO.OUTGOING.NOTIFICATION, notification, playerColor);
    }

    /*******************************
     *  socket.io handling methods *
     *******************************/

    // previousName and previousImage are optional
    _addPlayer(socket, previousName, previousImage) {
        const playerName = this.nameService.getPlayerName();
        const playerColor = this.colorService.getColor();
        const newPlayer = new Player(socket.id, playerName, playerColor);
        this.playerSpawnService.setupNewSpawn(newPlayer, this.adminService.getPlayerStartLength(),
            ServerConfig.SPAWN_TURN_LEEWAY);
        this.players[socket.id] = newPlayer;
        this.playerStatBoard.addPlayer(newPlayer.id, playerName, playerColor);
        socket.emit(ServerConfig.IO.OUTGOING.NEW_PLAYER_INFO, playerName, playerColor);
        socket.emit(ServerConfig.IO.OUTGOING.BOARD_INFO, Board);
        this.sendNotificationToPlayers(`${playerName} has joined!`, playerColor);
        const backgroundImage = this.imageService.getBackgroundImage();
        if (backgroundImage) {
            socket.emit(ServerConfig.IO.OUTGOING.NEW_BACKGROUND_IMAGE, backgroundImage);
        }

        const previousNameCleaned = ValidationService.cleanString(previousName);
        if (ValidationService.isValidPlayerName(previousNameCleaned)) {
            this._changePlayerName(socket, previousName);
        }
        if (previousImage) {
            this.imageService.updatePlayerImage(socket, previousImage);
        }

        // Start game if the first player has joined
        if (this._getNumberOfPlayers() === 1) {
            console.log('Game Started');
            this.runGameCycle();
        }
    }

    _changeColor(socket) {
        const player = this.players[socket.id];
        const newColor = this.colorService.getColor();
        this.colorService.returnColor(player.color);
        player.color = newColor;
        this.playerStatBoard.changePlayerColor(player.id, newColor);
        socket.emit(ServerConfig.IO.OUTGOING.NEW_PLAYER_INFO, player.name, newColor);
        this.sendNotificationToPlayers(`${player.name} has changed colors.`, newColor);
    }

    _changePlayerName(socket, newPlayerName) {
        const player = this.players[socket.id];
        const oldPlayerName = player.name;
        const newPlayerNameCleaned = ValidationService.cleanString(newPlayerName);
        if (!ValidationService.isValidPlayerName(newPlayerNameCleaned)) {
            console.log(`${player.name} tried changing to an invalid name`);
            return;
        }
        if (oldPlayerName === newPlayerNameCleaned) {
            return;
        }
        if (this.nameService.doesPlayerNameExist(newPlayerNameCleaned)) {
            socket.emit(ServerConfig.IO.OUTGOING.NEW_PLAYER_INFO, oldPlayerName, player.color);
            this.sendNotificationToPlayers(`${player.name} couldn't claim the name ${newPlayerNameCleaned}`, player.color);
        } else {
            this.sendNotificationToPlayers(`${oldPlayerName} is now known as ${newPlayerNameCleaned}`, player.color);
            player.name = newPlayerNameCleaned;
            this.nameService.usePlayerName(newPlayerNameCleaned);
            this.playerStatBoard.changePlayerName(player.id, newPlayerNameCleaned);
            socket.emit(ServerConfig.IO.OUTGOING.NEW_PLAYER_INFO, newPlayerNameCleaned, player.color);
        }
    }

    _disconnect(socket) {
        this._disconnectPlayer(socket.id);
    }

    _disconnectPlayer(playerId) {
        const player = this.players[playerId];
        if (!player) {
            return;
        }
        this.sendNotificationToPlayers(`${player.name} has left.`, player.color);
        this.colorService.returnColor(player.color);
        this.nameService.returnPlayerName(player.name);
        this.playerStatBoard.removePlayer(player.id);
        if (player.segments.length > 0) {
            this.boardOccupancyService.removePlayerOccupancy(player.id, player.segments);
        }
        delete this.players[playerId];
    }

    _keyDown(socket, keyCode) {
        GameControlsService.handleKeyDown(this.players[socket.id], keyCode);
    }

    _playerJoinGame(socket) {
        const player = this.players[socket.id];
        this.respawnPlayer(player);
        this.sendNotificationToPlayers(`${player.name} has rejoined the game.`, player.color);
    }

    _playerSpectateGame(socket) {
        const player = this.players[socket.id];
        this.boardOccupancyService.removePlayerOccupancy(player.id, player.segments);
        player.clearAllSegments();
        this.sendNotificationToPlayers(`${player.name} is now spectating.`, player.color);
    }

    _getNumberOfPlayers() {
        return Object.keys(this.players).length;
    }
}

module.exports = GameController;
