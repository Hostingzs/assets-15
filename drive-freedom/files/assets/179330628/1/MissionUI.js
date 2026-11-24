let MissionUI = pc.createScript("MissionUI");

MissionUI.attributes.add("xpIcon", {type:"asset", assetType:"sprite"});
MissionUI.attributes.add("coinsIcon", {type:"asset", assetType:"sprite"});
MissionUI.attributes.add("fuelIcon", {type:"asset", assetType:"sprite"});
MissionUI.attributes.add("healthIcon", {type:"asset", assetType:"sprite"});

const STARTED_COLOR = "#E0BF28";
const NOT_STARTED_COLOR = "#FFFFFF";

const COMPLETED_COLOR = "#28E06E";
const FAILED_COLOR = "#E03128";
const NOT_COMPLETED_COLOR = "#FFFFFF";

MissionUI.prototype.initialize = function () {
    this.startedColor = new pc.Color();
    this.startedColor.fromString(STARTED_COLOR);
    this.notStartedColor = new pc.Color();
    this.notStartedColor.fromString(NOT_STARTED_COLOR);
    this.completedColor = new pc.Color();
    this.completedColor.fromString(COMPLETED_COLOR);
    this.failedColor = new pc.Color();
    this.failedColor.fromString(FAILED_COLOR);
    this.notCompletedColor = new pc.Color();
    this.notCompletedColor.fromString(NOT_COMPLETED_COLOR);

    // this.app.on("mission:start", (mission) => {
    //     let activeMissions = this.app.missionManager.getActiveMissions();
    //     let idx = activeMissions.indexOf(mission);
    //     if (idx >= 0) {
    //         this.setStarted(idx);
    //     } else {
    //         console.error("MissionUI: started mission not found in active list");
    //     }
    // });

    this.initializeMissionItems();
    this.onShow(); // first time
    this.on("enable", this.onShow, this); // other times
    this.on("disable", () => {
        this.onHide();
    });

};

MissionUI.prototype.onShow = function () {
    // let missions = this.app.missionManager.getActiveMissions();

    // // get row items
    // let items = this.entity.find((child) => {return child.name === "Mission Row Item"});
    // items.forEach((item) => {
    //     item.enabled = false;
    // });

    // if (missions.length > items.length) {
    //     console.error("too many missions for display");
    // }

    // missions.forEach((mission, idx) => {
    //     if (idx > items.length) return;
    //     let row = items[idx];
    //     row.enabled = true;
        
    //     let color = mission.started ? this.startedColor : this.notStartedColor;
    //     row.findByName("Started Indicator").enabled = mission.started;
    //     row.findByName("Mission Name").element.text = mission.name;
    //     row.findByName("Mission Description").element.text = mission.description;
    //     row.findByName("Mission Name").element.color = color;
    //     row.findByName("Mission Description").element.color = color;
    //     row.findByName("Reward Icon").element.spriteAsset = this.getIconAsset(mission.reward.type);
    //     row.findByName("Reward Value").element.text = mission.reward.value;

    // });


    this.updateItems();
    this.updateButtonState();
    this.app.on("ui:button:click:end-current-mission", this.onButtonClick, this);
};

MissionUI.prototype.onHide = function () {
    this.app.off("ui:button:click:end-current-mission", this.onButtonClick, this);
    // this.app.game.maybeShowCommercialBreak();
}

MissionUI.prototype.initializeMissionItems = function () {
    let missions = this.app.missionManager.missions;
    let template = this.app.assets.find("Mission Item", "template");
    let group = this.entity.findByName("Layout Group");
    missions.forEach((mission) => {
        let item = template.resource.instantiate();
        item.findByName("Text").element.key = mission.name;
        item.findByName("Checkbox").element.color = this.notStartedColor;
        group.addChild(item);
    });
}

MissionUI.prototype.updateItems = function () {
    let missions = this.app.missionManager.missions;
    let group = this.entity.findByName("Layout Group");
    let items = group.findByTag("mission-item");
    missions.forEach((mission, idx) => {
        let item = items[idx];
        let color = (mission.status === MissionStatus.COMPLETE_SUCCESS) ? this.completedColor : (mission.status === MissionStatus.COMPLETE_FAILED) ? this.failedColor : this.notCompletedColor;
        item.findByName("Text").element.key = mission.name;
        item.findByName("Text").element.color = color;
        item.findByName("Checkbox").element.color = color;
        item.findByName("Check").enabled = (mission.status === MissionStatus.COMPLETE_SUCCESS);
        item.findByName("Cross").enabled = (mission.status === MissionStatus.COMPLETE_FAILED);

    });
}

MissionUI.prototype.onButtonClick = function () {
    this.app.missionManager.completeCurrentMission(false);
    this.entity.enabled = false;
}

MissionUI.prototype.updateButtonState = function () {
    let button = this.entity.findByName("End Current Mission Button");
    button.button.active = this.app.missionManager.getCurrentMission() !== null;
}

// MissionUI.prototype.setStarted = function (index) {
//     let items = this.entity.find((child) => {return child.name === "Mission Row Item"});
//     let row = items[index];
//     row.findByName("Started Indicator").enabled = true;
//     row.findByName("Mission Name").element.color = this.startedColor;
//     row.findByName("Mission Description").element.color = this.startedColor
// }

MissionUI.prototype.getIconAsset = function (type) {
    if (type === MissionRewardType.COINS) {
        return this.coinsIcon;
    } else if (type === MissionRewardType.XP) {
        return this.xpIcon;
    } else if (type === MissionRewardType.FUEL) {
        return this.fuelIcon;
    } else if (type === MissionRewardType.HEALTH) {
        return this.healthIcon;
    }    
}