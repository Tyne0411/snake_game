"use strict";
let Board = require("../configs/board");
let Coordinate = require("../models/coordinate");
let Direction = require("../models/direction");

class CoordinateService {

    static setStartingLocationAndDirection(player, playerLength, existingFood, existingPlayers) {
        let newDirection = this._getRandomDirection();
        let proposedHeadLocation, proposedFutureLocation;
        do {
            proposedHeadLocation = this.getUnoccupiedCoordinate(existingFood, existingPlayers);
            // Safety buffer of 5 spaces
            proposedFutureLocation = new Coordinate(proposedHeadLocation.x + (newDirection.x * 5),
                                                  proposedHeadLocation.y + (newDirection.y * 5));
        } while( this.isOutOfBounds(proposedFutureLocation) ) ; 
        
        let playerSegments = [];
        for( let i = 0; i < playerLength; i++) {
            playerSegments.push(this._getNextPlayerTailSegment(proposedHeadLocation, newDirection));
        }
        
        player.setDirectionAndStartingLocation(newDirection,playerSegments);
    }
    
    static movePlayer(player) {
        player.move(new Coordinate(player.getHeadLocation().x + player.direction.x, 
                                   player.getHeadLocation().y + player.direction.y));
    }

    static getUnoccupiedCoordinate(existingFood, existingPlayers) {
        let maxX = Board.HORIZONTAL_SQUARES - 1;
        let maxY = Board.VERTICAL_SQUARES - 1;
        let coordinate;
        do {
            coordinate = new Coordinate(this._getRandomIntegerInRange(1, maxX ),
                                        this._getRandomIntegerInRange(1, maxY ));
        } while (this._isLocationOccupied(coordinate, existingFood, existingPlayers));
        
        return coordinate; 
    }

    static hasPlayerCollidedWithAnotherPlayer(player, existingPlayers) {
        return this._getAllPlayerLocations(existingPlayers, player).filter(function(otherPlayerLocation) {
            return otherPlayerLocation.equals(player.getHeadLocation());
        }).length > 0;
    }
    
    static isOutOfBounds(coordinate) {
        return (coordinate.x <= 0) ||
               (coordinate.y <= 0) ||
               (coordinate.x >= Board.HORIZONTAL_SQUARES) ||
               (coordinate.y >= Board.VERTICAL_SQUARES);
    }
    
    // Optional excludedPlayer arg
    static _getAllPlayerLocations(existingPlayers, excludedPlayer) {
        let playerLocations = Object.keys(existingPlayers).reduce(function(collection, key) {
            let somePlayer = existingPlayers[key];
            if(!excludedPlayer || somePlayer.id !== excludedPlayer.id) {
                return collection.concat(somePlayer.segments);
            }
            return collection;
        }, []);
        return playerLocations;
    }
    
    static _isLocationOccupied(location, existingFood, existingPlayers) {
        let foodOccupied = existingFood.filter(function(food) {
            return food.location.equals(location);
        }).length > 0;
        if(foodOccupied) {
            return true;
        }
        return this._getAllPlayerLocations(existingPlayers).filter(function(somePlayerLocation) {
            return somePlayerLocation.equals(location);
        }).length > 0;
    }
    
    static _getNextPlayerTailSegment(location, direction) {
        return new Coordinate(location.x + (direction.x * -1),location.y + (direction.y * -1));
    }
    
    static _getRandomDirection() {
        let keys = Object.keys(Direction);
        return Direction[keys[ keys.length * Math.random() << 0]];
    }
    
    static _getRandomIntegerInRange(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

module.exports = CoordinateService;