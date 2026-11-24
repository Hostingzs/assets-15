let InGameUI = pc.createScript("InGameUI");

InGameUI.attributes.add("xpEl", {type: "entity"});
InGameUI.attributes.add("levelEl", {type: "entity"});
InGameUI.attributes.add("coinsEl", {type: "entity"});
InGameUI.attributes.add("fuelEl", {type: "entity"});
InGameUI.attributes.add("healthEl", {type: "entity"});
InGameUI.attributes.add("swapButton", {type: "entity"});
InGameUI.attributes.add("repairButton", {type: "entity"});
InGameUI.attributes.add("watchToRefuelButton", {type: "entity"});
InGameUI.attributes.add("activateMissionButton", {type: "entity"});
InGameUI.attributes.add("missionStartDialogEl", {type: "entity"});
InGameUI.attributes.add("missionStatusEl", {type: "entity"});
InGameUI.attributes.add("missionTimeEl", {type: "entity"});
InGameUI.attributes.add("missionCompleteDialogEl", {type: "entity"});
InGameUI.attributes.add("ongoingMissionStatusEl", {type: "entity"});
InGameUI.attributes.add("ongoingMissionCompleteDialogEl", {type: "entity"});
InGameUI.attributes.add("gameOverMenuEl", {type: "entity"});
InGameUI.attributes.add("bonusDialogEl", {type: "entity"});
InGameUI.attributes.add("bonusTypeEl", {type: "entity"});
InGameUI.attributes.add("bonusScoreEl", {type: "entity"});
InGameUI.attributes.add("stuntDialogEl", {type: "entity"});
InGameUI.attributes.add("stuntTypeEl", {type: "entity"});
InGameUI.attributes.add("stuntScoreEl", {type: "entity"});


const MISSION_ALERT_DISPLAY_TIME = 3;

InGameUI.prototype.initialize = function () {
    this.app.playerData.on("xpchange", this.onXpChange, this);
    this.app.playerData.on("levelchange", this.onLevelChange, this);
    this.app.playerData.on("coinschange", this.onCoinsChange, this);
    this.app.playerData.on("fuelchange", this.onFuelChange, this);
    this.app.playerData.on("healthchange", this.onHealthChange, this);

    this.app.on("ui:showbutton", this.showButton, this);
    this.app.on("ui:hidebutton", this.hideButton, this);

    this.app.on("ui:showgameover", this.showGameOver, this);
    this.app.on("ui:hidegameover", this.hideGameOver, this);

    this.app.on("mission:ui:start", this.onMissionStart, this);
//    this.app.on("mission:ui:locationdone", this.onMissionLocationDone, this);
    this.app.on("mission:ui:statuschange", this.onMissionStatusChange, this);
    this.app.on("mission:ui:complete", this.onMissionComplete, this);

    
    // disable an element after a timer
    this.disableTimer = 0;
    this.disableElements = [];

    // enable an element after a timer
    this.enableTimer = 0;
    this.enableElements = [];

    this.bonusTimer = 0;
    this.stuntTimer = 0;

    this.vehicleBadge  = this.entity.findByName("Vehicle Badge");
    this.showVehicleBadge = false;
    this.availableVehicles = [];

    this.freeStickerTimer = 0;
    this.freeStickerButton = this.entity.findByName("Free Sticker Button");
    this.app.on("ui:button:click:free-car-ingame", this.onClickFreeCar, this);
};

InGameUI.prototype.postInitialize = function () {
    this.missionScreen = this.app.root.findByName("Mission Screen");
    this.storeScreen = this.app.root.findByName("Store Screen");
    this.menuScreen = this.app.root.findByName("Menu Screen");
    this.creditsScreen = this.app.root.findByName("Credits Screen");

    this.app.on("ui:button:click:toggle-missions", this.toggleMissionMenu, this);
    this.app.on("ui:button:click:toggle-vehicles", this.toggleVehicleMenu, this);
    this.app.on("ui:button:click:input-capture", this.onInputCapture, this);
    this.app.on("ui:button:click:toggle-menu", this.toggleMenu, this);

    this.app.on("bonus:driftscore", this.onDriftScore, this);
    this.app.on("bonus:airscore", this.onAirScore, this);
    this.app.on("bonus:speedingscore", this.onSpeedingScore, this);
    this.app.on("bonus:360", this.on360, this);
    this.app.on("bonus:flip", this.onFlip, this);
    this.app.on("bonus:barrelroll", this.onRoll, this);

    this.initializeFromPlayerData();
};

InGameUI.prototype.initializeFromPlayerData = function () {
    let data = this.app.playerData;

    this.onXpChange(data.getXp(), 0);
    this.onLevelChange(data.getLevel(), 0);
    this.onCoinsChange(data.getCoins(), 0);
    this.onFuelChange(data.getFuel(), 0);
    this.onHealthChange(data.getHealth(), 0);

}

InGameUI.prototype.isInputAllowed = function () {
    return (!this.app.game.adPlaying && !this.app.game.inputDisabled);
}

InGameUI.prototype.update = function (dt) {    
    if (this.app.input.wasPressed(InputAction.STORE)) {
        this.toggleVehicleMenu();
    }

    if (this.app.input.wasPressed(InputAction.MISSIONS)) {
        this.toggleMissionMenu();
    }

    if (this.disableElements.length) {
        this.disableTimer -= dt;
        if (this.disableTimer <= 0) {
            this.disableTimer = 0;
            this.disableElements.forEach((el) => {el.enabled = false; console.log(`disabled: ${el.name}`)});
            this.disableElements.length = 0;
        }
    }
    
    if (this.enableElements.length) {
        this.enableTimer -= dt;
        if (this.enableTimer <= 0) {
            this.enableTimer = 0;
            this.enableElements.forEach((el) => {el.enabled = true;});
            this.enableElements.length = 0;
        }
    }

    let mission = this.app.missionManager.getCurrentMission();
    // let missions = this.app.missionManager.getActiveMissions();
    // missions.forEach((mission) => {
        if (mission && mission.hasTimer) {
            this.updateMissionTime(mission);
        }
    // });
    
    // disable bonus display after inactivty
    if (this.bonusDialogEl.enabled) {
        this.bonusTimer += dt;
        if (this.bonusTimer > 1) {
            this.bonusDialogEl.enabled = false;
        }
    }

    // disable stunt display after inactivty
    if (this.stuntDialogEl.enabled) {
        this.stuntTimer += dt;
        if (this.stuntTimer > 1) {
            this.stuntDialogEl.enabled = false;
        }
    }
    
//    let available = this.isNewStoreItemAvailable();

    if (this.showVehicleBadge) {
        this.vehicleBadge.enabled = true;
    } else {
        this.vehicleBadge.enabled = false;
    }

    this.updateFreeCarSticker(dt);
}

InGameUI.prototype.isNewStoreItemAvailable = function (item) {
    if (!this.app.game.vehicleData) return;

    let coins = this.app.playerData.getCoins();

    let owned = this.app.playerData.getVehicles();
    let available = [];

    let vehicles = this.app.game.vehicleData.vehicles;
    vehicles.forEach((data) => {
        if (!owned.includes(data.key)) {
            if (coins >= data.price) {
                available.push(data.key);
            }
        }
    });

    let diff = available.filter((v) => {
        return (!this.availableVehicles.includes(v));
    })
    this.availableVehicles = available;
    
    return diff.length > 0;
}


InGameUI.prototype.updateMissionTime = function (mission) {
    if (this.missionTimeEl) {
        this.missionTimeEl.element.text = mission.getCurrentTime();
    }
}

InGameUI.prototype.onXpChange = function (value, change) {
    this.xpEl.element.text = value.toFixed(0).toLocaleString()

    let pb = this.entity.findByName("XP Progress Bar");
    
    let nextLevel = this.app.playerData.getNextXp();
    // let nextLevel = this.app.playerData.requirements[this.app.playerData.level];

    pb.script.progressBar.setProgress(value / nextLevel);
};

InGameUI.prototype.onLevelChange = function (value, previous) {
    this.levelEl.element.text = value.toFixed(0).toLocaleString()

    let pb = this.entity.findByName("XP Progress Bar");
    let nextLevel = this.app.playerData.getNextXp();
    // let nextLevel = this.app.playerData.requirements[this.app.playerData.getLevel()];
    pb.script.progressBar.setProgress(this.app.playerData.getXp() / nextLevel);
};

InGameUI.prototype.onCoinsChange = function (value, previous) {
    this.coinsEl.element.text = value.toFixed(0).toLocaleString();

    if (!this.showVehicleBadge) {
        this.showVehicleBadge = this.isNewStoreItemAvailable();
    }
};

InGameUI.prototype.onHealthChange = function (value, previous) {
    // this.healthEl.element.text = Math.ceil(value.toFixed(0));

    let pb = this.entity.findByName("Health Progress Bar");
    pb.script.progressBar.setProgress(value / this.app.playerData.getMaxHealth());

};

InGameUI.prototype.onFuelChange = function (value, previous) {
    // this.fuelEl.element.text = Math.ceil(value.toFixed(0));

    let pb = this.entity.findByName("Fuel Progress Bar");
    pb.script.progressBar.setProgress(value / this.app.playerData.getMaxFuel());
};

InGameUI.prototype.showButton = function (button) {
    switch (button) {
        case "swap":
            this.swapButton.enabled = true;
        break;
        case "repair":
            this.repairButton.enabled = true;
        break;
        case "watchtorefuel":
            this.showRefuel();
        break;
        case "activatemission":
            this.activateMissionButton.enabled = true;
        break;
    }
};

InGameUI.prototype.hideButton = function (button) {
    switch (button) {
        case "swap":
            this.swapButton.enabled = false;
        break;
        case "repair":
            this.repairButton.enabled = false;
        case "watchtorefuel":
            this.hideRefuel();
        break;
        case "activatemission":
            this.activateMissionButton.enabled = false;
        break;
    }
};

InGameUI.prototype.showRefuel = function () {
    this.storeScreen.enabled = false;
    this.missionScreen.enabled = false;

    if (!this.gameOverMenuEl.enabled) {
        this.watchToRefuelButton.enabled = true;
    }
}

InGameUI.prototype.hideRefuel = function () {
    this.watchToRefuelButton.enabled = false;
}


InGameUI.prototype.showGameOver = function () {
    this.storeScreen.enabled = false;
    this.missionScreen.enabled = false;

    if (this.watchToRefuelButton.enabled) {
        this.hideRefuel();
    }
    this.gameOverMenuEl.enabled = true;
}

InGameUI.prototype.hideGameOver = function () {
    this.gameOverMenuEl.enabled = false;
}

InGameUI.prototype.onMissionStart = function (mission) {
    this.missionStartDialogEl.enabled = true;
    let missionNameEl = this.missionStartDialogEl.findByName("Mission Name");
    let missionDescriptionEl = this.missionStartDialogEl.findByName("Mission Description");

    missionNameEl.element.key = mission.name;
    missionDescriptionEl.element.key = mission.description;

    // show element for a few seconds
    //this.delayedDisable([this.missionStartDialogEl], MISSION_ALERT_DISPLAY_TIME);
    
    // let entities = [this.missionStatusEl];
    // if (mission.hasTimer) {
    //     entities.push(this.missionTimeEl);
    // }
    // this.delayedEnable(entities, MISSION_ALERT_DISPLAY_TIME);

    this.missionStatusEl.enabled = true;
    this.missionTimeEl.enabled = mission.hasTimer;

    this.onMissionStatusChange(mission); // initialize status
}


InGameUI.prototype.onMissionStatusChange = function (mission) {
    if (mission.triggeredStart) {
        if (this.missionStatusEl) {
            this.missionStatusEl.element.text = mission.getCurrentStatus();
        }
    } else {
        if (this.ongoingMissionStatusEl) {
            this.ongoingMissionStatusEl.enabled = true;
            let nameEl = this.ongoingMissionStatusEl.findByName("Ongoing Mission Name")
            let statusEl = this.ongoingMissionStatusEl.findByName("Ongoing Mission Status")
            nameEl.element.key = mission.name;
            statusEl.element.text = mission.getCurrentStatus();
            this.delayedDisable([this.ongoingMissionStatusEl], MISSION_ALERT_DISPLAY_TIME)        
        }
    }
}

InGameUI.prototype.onMissionComplete = function (mission) {
    if (!this.missionStatusEl || !this.missionCompleteDialogEl) {
        console.error("missing attributes in game ui");
    }


    if (mission.triggeredStart) {
        // current displayed mission

        // hide name and description
        this.missionStartDialogEl.enabled = false;

        this.missionStatusEl.enabled = false;
        this.missionTimeEl.enabled = false;
        
        this.missionCompleteDialogEl.enabled = true;
        let missionStatusEl = this.missionCompleteDialogEl.findByName("Mission Status");
        let missionNameEl = this.missionCompleteDialogEl.findByName("Mission Name");
    
        // if (MissionStatus.COMPLETE_SUCCESS) {
        //     missionStatusEl.element.color = new pc.Color()    
        // }
        missionStatusEl.element.key = mission.status === MissionStatus.COMPLETE_SUCCESS ? "MISSION_COMPLETE" : "MISSION_FAILED";
        missionNameEl.element.key = mission.name;
    
        this.delayedDisable([this.missionCompleteDialogEl], MISSION_ALERT_DISPLAY_TIME)        
    } else {
        // ongoing missions

        this.ongoingMissionStatusEl.enabled = false;
        // this.missionTimeEl.enabled = false;
        
        this.ongoingMissionCompleteDialogEl.enabled = true;
        let missionStatusEl = this.ongoingMissionCompleteDialogEl.findByName("Mission Status");
        let missionNameEl = this.ongoingMissionCompleteDialogEl.findByName("Mission Name");
    
        missionStatusEl.element.key = mission.status === MissionStatus.COMPLETE_SUCCESS ? "MISSION_COMPLETE" : "MISSION_FAILED";
        missionNameEl.element.key = mission.name;
    
        this.delayedDisable([this.ongoingMissionCompleteDialogEl], MISSION_ALERT_DISPLAY_TIME)
    }


}

InGameUI.prototype.delayedEnable = function (entities, time) {
    // concat new entities
    this.enableElements = Array.from(new Set([...this.enableElements, ...entities]));
    this.enableTimer = time;
}

InGameUI.prototype.delayedDisable = function (entities, time) {
    // concat new entities
    this.disableElements = Array.from(new Set([...this.disableElements, ...entities]));
    this.disableTimer = time;

}

InGameUI.prototype.onDriftScore = function (score) {
    if (score > 0) {
        this.bonusDialogEl.enabled = true;
        this.bonusTypeEl.element.key = "DRIFTING!";
        this.bonusScoreEl.element.text = score;
    } else {
        this.bonusDialogEl.enabled = false;
    }

    this.bonusTimer = 0;
}

InGameUI.prototype.onAirScore = function (score) {
    if (score > 0) {
        this.bonusDialogEl.enabled = true;
        this.bonusTypeEl.element.key = "AIR TIME!";
        this.bonusScoreEl.element.text = score;
    } else {
        this.bonusDialogEl.enabled = false;
    }

    this.bonusTimer = 0;
}

InGameUI.prototype.onSpeedingScore = function (score) {
    if (score > 0) {
        this.bonusDialogEl.enabled = true;
        this.bonusTypeEl.element.key = "SPEEDING!";
        this.bonusScoreEl.element.text = score;
    } else {
        this.bonusDialogEl.enabled = false;
    }

    this.bonusTimer = 0;
}

InGameUI.prototype.on360 = function () {
    this.stuntDialogEl.enabled = true;
    this.stuntTypeEl.element.key = "360!";
    this.stuntScoreEl.element.text = 360;
    this.stuntTimer = 0;
};

InGameUI.prototype.onFlip = function (back) {
    this.stuntDialogEl.enabled = true;
    this.stuntTypeEl.element.key = back ? "BACK FLIP!" : "FRONT FLIP!"
    this.stuntScoreEl.element.text = 360;
    this.stuntTimer = 0;
};

InGameUI.prototype.onRoll = function (back) {
    this.stuntDialogEl.enabled = true;
    this.stuntTypeEl.element.key = "BARREL ROLL!"
    this.stuntScoreEl.element.text = 360;
    this.stuntTimer = 0;
};

InGameUI.prototype.toggleMissionMenu = function () {
    if (!this.isInputAllowed()) return;

    if (this.gameOverMenuEl.enabled || this.watchToRefuelButton.enabled) return;

    // toggle missions screen
    if (!this.storeScreen.enabled) {
        this.missionScreen.enabled = !this.missionScreen.enabled;    
    }

    if (this.missionScreen.enabled) {
        this.app.fire("game:pause");
    } else {
        this.app.fire("game:unpause");
    }
}

InGameUI.prototype.toggleVehicleMenu = function () {
    if (!this.isInputAllowed()) return;

    if (this.gameOverMenuEl.enabled || this.watchToRefuelButton.enabled) return;
    
    if (!this.missionScreen.enabled) {
        this.storeScreen.enabled = !this.storeScreen.enabled;    
        this.showVehicleBadge = false;
    }

    if (this.storeScreen.enabled) {
        this.app.fire("game:pause");
    } else {
        this.app.fire("game:unpause");
    }

}

InGameUI.prototype.toggleMenu = function () {
    if (!this.isInputAllowed()) return;

    if (this.gameOverMenuEl.enabled || this.watchToRefuelButton.enabled) return;
    
    if (this.storeScreen.enabled) {
        this.toggleVehicleMenu();
    }
    if (this.missionScreen.enabled) {
        this.toggleMissionMenu();
    }

    this.menuScreen.enabled = !this.menuScreen.enabled;

    if (this.menuScreen.enabled) {
        this.app.fire("game:pause");
    } else {
        this.app.fire("game:unpause");
    }

}

InGameUI.prototype.onInputCapture = function () {
    if (!this.isInputAllowed()) return;

    // unpause before disable events that might start an commercial
    // this.app.fire("game:unpause");

    if (this.missionScreen.enabled) {
        this.missionScreen.enabled = false;
        this.app.game.maybeShowCommercialBreak();
    }

    if (this.storeScreen.enabled) {
        this.storeScreen.enabled = false;
        this.app.game.maybeShowCommercialBreak();
    }

    if (this.menuScreen.enabled) {
        this.menuScreen.enabled = false;
        this.app.game.maybeShowCommercialBreak();
    }

    if (this.creditsScreen.enabled) {
        this.creditsScreen.enabled = false;
        this.app.game.maybeShowCommercialBreak();
    }
}

InGameUI.prototype.updateFreeCarSticker = function (dt) {
    const FREE_STICKER_TIME = 120;
    const FREE_VEHICLE_NAME = 'aphrodite';

    let data = this.app.game.vehicleData.vehicles.filter((item) => item.key === FREE_VEHICLE_NAME)[0];
    let vehicles = this.app.playerData.getVehicles();
    let owned = (vehicles.indexOf(data.key) > -1);

    if (owned) {
        this.freeStickerButton.enabled = false;
        return;
    }

    if (this.freeStickerButton.enabled) {
        return;
    }

    this.freeStickerTimer += dt;
    if (this.freeStickerTimer > FREE_STICKER_TIME) {
        this.freeStickerButton.enabled = true;
    }
}

InGameUI.prototype.onClickFreeCar = async function () {
    const FREE_VEHICLE_NAME = 'aphrodite';
    let data = this.app.game.vehicleData.vehicles.filter((item) => item.key === FREE_VEHICLE_NAME)[0];
    let vehicles = this.app.playerData.getVehicles();
    let owned = (vehicles.indexOf(data.key) > -1);
    if (owned) {
        return;
    }

    let success = await this.app.poki.startRewardedBreak();
    if (success) {
        this.app.playerData.addVehicle(data.key);
        this.app.game.switchVehicle(data.key);
        this.freeStickerButton.enabled = false;
    }
}