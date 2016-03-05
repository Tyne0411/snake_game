define([
    'config/client-config',
    'view/dom-helper',
],

(ClientConfig, DomHelper) => {
    'use strict';

    const ENTER_KEYCODE = 13;
    const SPACE_BAR_KEYCODE = 32;
    const LEFT_ARROW_KEYCODE = 37;
    const UP_ARROW_KEYCODE = 38;
    const RIGHT_ARROW_KEYCODE = 39;
    const DOWN_ARROW_KEYCODE = 40;

    class GameView {

        constructor(backgroundImageUploadCallback, botChangeCallback, foodChangeCallback, imageUploadCallback,
            joinGameCallback, keyDownCallback, playerColorChangeCallback, playerNameUpdatedCallback, spectateGameCallback,
            speedChangeCallback, startLengthChangeCallback, toggleGridLinesCallback) {
            this.isChangingName = false;
            this.backgroundImageUploadCallback = backgroundImageUploadCallback;
            this.botChangeCallback = botChangeCallback;
            this.foodChangeCallback = foodChangeCallback;
            this.imageUploadCallback = imageUploadCallback;
            this.joinGameCallback = joinGameCallback;
            this.keyDownCallback = keyDownCallback;
            this.playerColorChangeCallback = playerColorChangeCallback;
            this.playerNameUpdatedCallback = playerNameUpdatedCallback;
            this.spectateGameCallback = spectateGameCallback;
            this.speedChangeCallback = speedChangeCallback;
            this.startLengthChangeCallback = startLengthChangeCallback;
            this.toggleGridLinesCallback = toggleGridLinesCallback;
            this._setUpEventHandling();
        }

        ready() {
            // Show everything when ready
            DomHelper.showAllContent();
        }

        showFoodAmount(foodAmount) {
            DomHelper.setCurrentFoodAmountLabelText(foodAmount);
        }

        showKillMessage(killerName, victimName, killerColor, victimColor, victimLength) {
            DomHelper.setKillMessagesDivText(`<span style='color: ${killerColor}'>${killerName}</span> killed ` +
                `<span style='color: ${victimColor}'>${victimName}</span>` +
                ` and grew by <span style='color: ${killerColor}'>${victimLength}</span>`);
        }

        showKilledEachOtherMessage(victimSummaries) {
            let victims = '';
            for (const victimSummary of victimSummaries) {
                victims += `<span style='color: ${victimSummary.color}'>${victimSummary.name}</span> `;
            }
            DomHelper.setKillMessagesDivText(`${victims} have killed each other`);
        }

        showRanIntoWallMessage(playerName, playerColor) {
            DomHelper.setKillMessagesDivText(`<span style='color: ${playerColor}'>${playerName}</span> ran into a wall`);
        }

        showSuicideMessage(victimName, victimColor) {
            DomHelper.setKillMessagesDivText(`<span style='color: ${victimColor}'>${victimName}</span> committed suicide`);
        }

        showNotification(notification, playerColor) {
            const notificationDiv = DomHelper.getNotificationsDiv();
            const formattedNotification = `<div><span class='timelabel'>${new Date().toLocaleTimeString()} - </span>` +
                `<span style='color: ${playerColor}'>${notification}<span/></div>`;
            notificationDiv.innerHTML = formattedNotification + notificationDiv.innerHTML;
        }

        showNumberOfBots(numberOfBots) {
            DomHelper.setCurrentNumberOfBotsLabelText(numberOfBots);
        }

        showPlayerStats(playerStats) {
            let formattedScores = '<div class="playerStatsHeader"><span class="image"></span>' +
                '<span class="name">Name</span>' +
                '<span class="stat">Score</span>' +
                '<span class="stat">High</span>' +
                '<span class="stat">Kills</span>' +
                '<span class="stat">Deaths</span></div>';
            for (const playerStat of playerStats) {
                let playerImageElement = '';
                if (playerStat.base64Image) {
                    playerImageElement = `<img src=${playerStat.base64Image} class='playerStatsImage'></img>`;
                }
                formattedScores += `<div class='playerStatsContent'><span class='image'>${playerImageElement}</span>` +
                    `<span class='name' style='color: ${playerStat.color}'>${playerStat.name}</span>` +
                    `<span class='stat'>${playerStat.score}</span>` +
                    `<span class='stat'>${playerStat.highScore}</span>` +
                    `<span class='stat'>${playerStat.kills}</span>` +
                    `<span class='stat'>${playerStat.deaths}</span></div>`;
            }
            DomHelper.setPlayerStatsDivText(formattedScores);
        }

        showSpeed(speed) {
            DomHelper.setCurrentSpeedLabelText(speed);
        }

        showStartLength(startLength) {
            DomHelper.setCurrentStartLengthLabelText(startLength);
        }

        updatePlayerName(playerName, playerColor) {
            DomHelper.setPlayerNameElementValue(playerName);
            if (playerColor) {
                DomHelper.setPlayerNameElementColor(playerColor);
            }
        }

        /*******************
         *  Event handling *
         *******************/

        _handleChangeColorButtonClick() {
            this.playerColorChangeCallback();
        }

        _handleChangeNameButtonClick() {
            if (this.isChangingName) {
                this._saveNewPlayerName();
            } else {
                DomHelper.setChangeNameButtonText('Save');
                DomHelper.setPlayerNameElementReadOnly(false);
                DomHelper.getPlayerNameElement().select();
                this.isChangingName = true;
            }
        }

        _handleKeyDown(e) {
            // Prevent keyboard scrolling default behavior
            if ((e.keyCode === UP_ARROW_KEYCODE || e.keyCode === DOWN_ARROW_KEYCODE) ||
                 (e.keyCode === SPACE_BAR_KEYCODE && e.target === DomHelper.getBody())) {
                e.preventDefault();
            }

            // When changing names, save new name on enter
            if (e.keyCode === ENTER_KEYCODE && this.isChangingName) {
                this._saveNewPlayerName();
                DomHelper.blurActiveElement();
                return;
            }

            if (!this.isChangingName) {
                this.keyDownCallback(e.keyCode);
            }
        }

        _handleDecreaseBotsButtonClick() {
            this.botChangeCallback(ClientConfig.INCREMENT_CHANGE.DECREASE);
        }

        _handleIncreaseBotsButtonClick() {
            this.botChangeCallback(ClientConfig.INCREMENT_CHANGE.INCREASE);
        }

        _handleResetBotsButtonClick() {
            this.botChangeCallback(ClientConfig.INCREMENT_CHANGE.RESET);
        }

        _handleDecreaseFoodButtonClick() {
            this.foodChangeCallback(ClientConfig.INCREMENT_CHANGE.DECREASE);
        }

        _handleIncreaseFoodButtonClick() {
            this.foodChangeCallback(ClientConfig.INCREMENT_CHANGE.INCREASE);
        }

        _handleResetFoodButtonClick() {
            this.foodChangeCallback(ClientConfig.INCREMENT_CHANGE.RESET);
        }

        _handleDecreaseSpeedButtonClick() {
            this.speedChangeCallback(ClientConfig.INCREMENT_CHANGE.DECREASE);
        }

        _handleIncreaseSpeedButtonClick() {
            this.speedChangeCallback(ClientConfig.INCREMENT_CHANGE.INCREASE);
        }

        _handleResetSpeedButtonClick() {
            this.speedChangeCallback(ClientConfig.INCREMENT_CHANGE.RESET);
        }

        _handleDecreaseStartLengthButtonClick() {
            this.startLengthChangeCallback(ClientConfig.INCREMENT_CHANGE.DECREASE);
        }

        _handleIncreaseStartLengthButtonClick() {
            this.startLengthChangeCallback(ClientConfig.INCREMENT_CHANGE.INCREASE);
        }

        _handleResetStartLengthButtonClick() {
            this.startLengthChangeCallback(ClientConfig.INCREMENT_CHANGE.RESET);
        }

        _handleClearUploadedBackgroundImageButtonClick() {
            this.backgroundImageUploadCallback();
        }

        _handleClearUploadedImageButtonClick() {
            this.imageUploadCallback();
        }

        _handleBackgroundImageUpload() {
            const uploadedBackgroundImageAsFile = DomHelper.getBackgroundImageUploadElement().files[0];
            if (uploadedBackgroundImageAsFile) {
                // Convert file to image
                const image = new Image();
                const self = this;
                image.onload = () => {
                    self.backgroundImageUploadCallback(image, uploadedBackgroundImageAsFile.type);
                };
                image.src = URL.createObjectURL(uploadedBackgroundImageAsFile);
            }
        }

        _handleImageUpload() {
            const uploadedImageAsFile = DomHelper.getImageUploadElement().files[0];
            if (uploadedImageAsFile) {
                // Convert file to image
                const image = new Image();
                const self = this;
                image.onload = () => {
                    self.imageUploadCallback(image, uploadedImageAsFile.type);
                };
                image.src = URL.createObjectURL(uploadedImageAsFile);
            }
        }

        _handlePlayOrWatchButtonClick() {
            const command = DomHelper.getPlayOrWatchButton().textContent;
            if (command === 'Play') {
                DomHelper.setPlayOrWatchButtonText('Watch');
                this.joinGameCallback();
            } else {
                DomHelper.setPlayOrWatchButtonText('Play');
                this.spectateGameCallback();
            }
        }

        _handleToggleGridLinesButtonClick() {
            this.toggleGridLinesCallback();
        }

        _saveNewPlayerName() {
            const playerName = DomHelper.getPlayerNameElement().value;
            if (playerName && playerName.trim().length > 0 && playerName.length <= ClientConfig.MAX_NAME_LENGTH) {
                this.playerNameUpdatedCallback(playerName);
                DomHelper.setChangeNameButtonText('Change Name');
                DomHelper.setPlayerNameElementReadOnly(true);
                this.isChangingName = false;
                DomHelper.hideInvalidPlayerNameLabel();
            } else {
                DomHelper.showInvalidPlayerNameLabel();
            }
        }

        _setUpEventHandling() {
            DomHelper.getChangeColorButton().addEventListener('click',
                this._handleChangeColorButtonClick.bind(this), false);
            DomHelper.getChangeNameButton().addEventListener('click',
                this._handleChangeNameButtonClick.bind(this), false);
            DomHelper.getIncreaseBotsButton().addEventListener('click',
                this._handleIncreaseBotsButtonClick.bind(this), false);
            DomHelper.getDecreaseBotsButton().addEventListener('click',
                this._handleDecreaseBotsButtonClick.bind(this), false);
            DomHelper.getResetBotsButton().addEventListener('click',
                this._handleResetBotsButtonClick.bind(this), false);
            DomHelper.getIncreaseFoodButton().addEventListener('click',
                this._handleIncreaseFoodButtonClick.bind(this), false);
            DomHelper.getDecreaseFoodButton().addEventListener('click',
                this._handleDecreaseFoodButtonClick.bind(this), false);
            DomHelper.getResetFoodButton().addEventListener('click',
                this._handleResetFoodButtonClick.bind(this), false);
            DomHelper.getIncreaseSpeedButton().addEventListener('click',
                this._handleIncreaseSpeedButtonClick.bind(this), false);
            DomHelper.getDecreaseSpeedButton().addEventListener('click',
                this._handleDecreaseSpeedButtonClick.bind(this), false);
            DomHelper.getResetSpeedButton().addEventListener('click',
                this._handleResetSpeedButtonClick.bind(this), false);
            DomHelper.getIncreaseStartLengthButton().addEventListener('click',
                this._handleIncreaseStartLengthButtonClick.bind(this), false);
            DomHelper.getDecreaseStartLengthButton().addEventListener('click',
                this._handleDecreaseStartLengthButtonClick.bind(this), false);
            DomHelper.getResetStartLengthButton().addEventListener('click',
                this._handleResetStartLengthButtonClick.bind(this), false);
            DomHelper.getImageUploadElement().addEventListener('change',
                this._handleImageUpload.bind(this));
            DomHelper.getClearUploadedImageButton().addEventListener('click',
                this._handleClearUploadedImageButtonClick.bind(this));
            DomHelper.getBackgroundImageUploadElement().addEventListener('change',
                this._handleBackgroundImageUpload.bind(this));
            DomHelper.getClearUploadedBackgroundImageButton().addEventListener('click',
                this._handleClearUploadedBackgroundImageButtonClick.bind(this));
            DomHelper.getPlayOrWatchButton().addEventListener('click',
                this._handlePlayOrWatchButtonClick.bind(this), false);
            DomHelper.getToggleGridLinesButton().addEventListener('click',
                this._handleToggleGridLinesButtonClick.bind(this), false);
            DomHelper.getFullScreenButton().addEventListener('click', DomHelper.toggleFullScreenMode, false);
            window.addEventListener('keydown', this._handleKeyDown.bind(this), true);
        }
    }

    return GameView;
});
