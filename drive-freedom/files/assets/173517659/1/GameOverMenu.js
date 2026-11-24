let GameOverMenu = pc.createScript("GameOverMenu");

const RESPAWN_COST = 100;
const AdMenuState = {
    HIDDEN: "hidden",
    WAITING: "waiting",
    AD_PLAYING: "ad_playing",
}

GameOverMenu.attributes.add("respawnButton", {type:"entity"});
GameOverMenu.attributes.add("freeRespawnButton", {type:"entity"});

GameOverMenu.prototype.initialize = function () {
    this.respawnButton.button.on("click", this.onPaidRespawnClick, this);
    this.freeRespawnButton.button.on("click", this.onFreeRespawnClick, this);

    this.state = AdMenuState.HIDDEN;
    this.currentRespawnCost = RESPAWN_COST;
    // test for first enable
    this.onShow();
    // test for subsequent enables
    this.on("enable", () => {
        this.onShow();
    });

}


GameOverMenu.prototype.onShow = function () {
    this.state = AdMenuState.WAITING;

    this.app.poki.gameplayStop();

    this.app.input.listen(InputAction.ACTIVATE, this.onFreeRespawnClick, this);

    let priceEl = this.respawnButton.findByName("Price");
    let iconEl = this.respawnButton.findByName("Icon");

    priceEl.element.text = this.currentRespawnCost;

    let coins = this.app.playerData.getCoins();
    if (coins < this.currentRespawnCost) {
        this.respawnButton.button.active = false;
        priceEl.element.color = new pc.Color(0.5,0.5,0.5);
        iconEl.element.color = new pc.Color(0.5,0.5,0.5);
    } else {
        this.respawnButton.button.active = true;
        priceEl.element.color = new pc.Color(1,1,1);
        iconEl.element.color = new pc.Color(1,1,1);
    }

}

GameOverMenu.prototype.onHide = function () {
    this.state = AdMenuState.HIDDEN;
    this.app.input.unlisten(InputAction.ACTIVATE, this.onFreeRespawnClick, this);
    this.app.poki.gameplayStart();
}

GameOverMenu.prototype.onFreeRespawnClick = async function () {
    if (this.state !== AdMenuState.WAITING) {
        return;
    }

    this.state = AdMenuState.AD_PLAYING;

    // hide UI, watch an ad, then respawn
    this.app.poki.trackEvent('gameplay', 'freerespawn', this.currentRespawnCost);

    let success = await this.app.poki.startRewardedBreak();
    if (!success) {
        // reward failed, charge for respawn
        this.app.playerData.changeCoins(-RESPAWN_COST);
        this.app.fire("toast:coins", -RESPAWN_COST);
    }

    this.app.fire("game:respawn");
    this.app.fire("ui:hidegameover");

    this.currentRespawnCost -= 100;
    if (this.currentRespawnCost < 100) {
        this.currentRespawnCost = 100;
    }

    this.onHide();
}

GameOverMenu.prototype.onPaidRespawnClick = async function () {
    if (this.state !== AdMenuState.WAITING) {
        return;
    }

    this.state = AdMenuState.AD_PLAYING;

    this.app.poki.trackEvent('gameplay', 'paidrespawn', this.currentRespawnCost);

    await this.app.poki.startCommercialBreak();

    this.app.playerData.changeCoins(-this.currentRespawnCost);
    this.app.fire("toast:coins", -this.currentRespawnCost);
    this.app.fire("game:respawn");
    this.app.fire("ui:hidegameover");

    this.currentRespawnCost += 100;
    if (this.currentRespawnCost > 1000) {
        this.currentRespawnCost = 999;
    }

    this.onHide();
}