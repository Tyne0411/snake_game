define(function () {
    "use strict";

    class DomHelper {
    
        static blurActiveElement() {
            document.activeElement.blur();
        }
        
        static createElement(elementName) {
            return document.createElement(elementName);
        }
    
        static getBody() {
            return document.body;
        }
    
        static getCoverDiv() {
            return document.getElementById("cover");
        }
        
        static getCurrentFoodAmountLabel() {
            return document.getElementById("currentFoodAmount");
        }
        
        static getCurrentSpeedLabel() {
            return document.getElementById("currentSpeed");
        }
        
        static getChangeColorButton() {
            return document.getElementById("changePlayerColorButton");
        }
        
        static getChangeNameButton() {
            return document.getElementById("changePlayerNameButton");
        }
        
        static getDecreaseFoodButton() {
            return document.getElementById("decreaseFoodButton");
        }
        
        static getDecreaseSpeedButton() {
            return document.getElementById("decreaseSpeedButton");
        }
        
        static getGameBoardDiv() {
            return document.getElementById("gameBoard");
        }
        
        static getIncreaseFoodButton() {
            return document.getElementById("increaseFoodButton");
        }
        
        static getIncreaseSpeedButton() {
            return document.getElementById("increaseSpeedButton");
        }
        
        static getInvalidPlayerNameLabel() {
            return document.getElementById("invalidPlayerNameLabel");
        }
        
        static getNotificationsDiv() {
            return document.getElementById("notifications");
        }
        
        static getPlayerNameElement() {
            return document.getElementById("playerName");
        }
        
        static getPlayerStatsDiv() {
            return document.getElementById("playerStats");
        }
        
        static getResetFoodButton() {
            return document.getElementById("resetFoodButton");
        }
        
        static getResetSpeedButton() {
            return document.getElementById("resetSpeedButton");
        }
    }

    return DomHelper;

});     