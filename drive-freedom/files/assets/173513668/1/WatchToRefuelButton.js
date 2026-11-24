let WatchToRefuelButton = pc.createScript("WatchToRefuelButton");

WatchToRefuelButton.attributes.add("freeRefuelButton", {type: "entity"});
WatchToRefuelButton.attributes.add("paidRefuelButton", {type: "entity"});

WatchToRefuelButton.prototype.initialize = function () {
    this.paidRefuelButton.button.on("click", this.onPaidRefuelClick, this);
    this.freeRefuelButton.button.on("click", this.onFreeRefuelClick, this);

    this.currentRefuelCost = RESPAWN_COST;

    // first time
    this.onShow();

    // other times
    this.on("enable", () => {
        this.onShow();
    });
}

WatchToRefuelButton.prototype.onShow = function () {
    this.app.input.listen(InputAction.ACTIVATE, this.onClick, this);
    this.app.poki.gameplayStop();

    let priceEl = this.paidRefuelButton.findByName("Price");
    let iconEl = this.paidRefuelButton.findByName("Icon");

    priceEl.element.text = this.currentRefuelCost;

    // disable paid button if player has no coins
    let coins = this.app.playerData.getCoins();
    if (coins < this.currentRefuelCost) {
        this.paidRefuelButton.button.active = false;
        priceEl.element.color = new pc.Color(0.5,0.5,0.5);
        iconEl.element.color = new pc.Color(0.5,0.5,0.5);
    } else {
        this.paidRefuelButton.button.active = true;
        priceEl.element.color = new pc.Color(1,1,1);
        iconEl.element.color = new pc.Color(1,1,1);
    }
}

WatchToRefuelButton.prototype.onHide = function () {
    this.app.input.unlisten(InputAction.ACTIVATE, this.onClick, this);
    this.app.poki.gameplayStart();
}

WatchToRefuelButton.prototype.onFreeRefuelClick = async function (e) {
    this.app.poki.trackEvent('gameplay', 'freerefuel', this.currentRefuelCost);

    let success = await this.app.poki.startRewardedBreak();
    if (!success) {
        // reward failed, charge for refuel
        this.app.playerData.changeCoins(-this.currentRefuelCost);
        this.app.fire("toast:coins", -this.currentRefuelCost);
    }

    let fuelNeeded = this.app.playerData.getMaxFuel() - this.app.playerData.getFuel();
    this.app.playerData.changeFuel(fuelNeeded);
    this.app.fire("toast:fuel", fuelNeeded);
    this.app.fire("ui:hidebutton", "watchtorefuel");    
    this.onHide();

    this.currentRefuelCost -= 100;
    if (this.currentRefuelCost < 100) {
        this.currentRefuelCost = 100;
    }
};


WatchToRefuelButton.prototype.onPaidRefuelClick = async function (e) {
    this.app.poki.trackEvent('gameplay', 'paidrefuel', this.currentRefuelCost);

    await this.app.poki.startCommercialBreak();
    
    // remove coins
    this.app.playerData.changeCoins(-this.currentRefuelCost);
    this.app.fire("toast:coins", -this.currentRefuelCost);

    let fuelNeeded = this.app.playerData.getMaxFuel() - this.app.playerData.getFuel();
    this.app.playerData.changeFuel(fuelNeeded);
    this.app.fire("toast:fuel", fuelNeeded);
    this.app.fire("ui:hidebutton", "watchtorefuel");    
    this.onHide();

    this.currentRefuelCost += 100;
    if (this.currentRefuelCost > 1000) {
        this.currentRefuelCost = 999;
    }
};


