const MissionClass = {}; // class lookup


const MissionTypes = {
    PICKUP_DROPOFF: "pickupdropoff",
    CHECKPOINT_RACE: "checkpointrace",
    HIT_X_THINGS: "hitxthings",
    BONUS_STAT_MISSION: "bonusstatmission",
    STUNT_MISSION: "stuntmission"

};


const MissionStatus = {
    NOT_STARTED: "not_started",
    IN_PROGRESS: "in_progress",
    COMPLETE_SUCCESS: "success",
    COMPLETE_FAILED: "failed"
};



const MissionRewardType = {
    NONE: "none",
    COINS: "coins",
    XP: "xp",
    HEALTH: "health",
    FUEL: "fuel"
};

// determines the type of graphics to show at each location
const MissionLocationType = {
    NONE: null,
    BOX_PICKUP: "boxpickup",
    BOX_DROPOFF: "boxdropoff",
    RACE_CHECKPOINT: "racecheckpoint",
    RACE_FINISH: "racefinish",
    START_TRIGGER: "starttrigger"
};

// const ConvertMissionLocationType = {
//     0: "boxpickup",
//     1: "boxdropoff",
//     2: "racecheckpoint",
//     3: "racefinish",

// };

class MissionLocation {
    constructor(position, radius, type) {
        // validate input
        if (!(position instanceof pc.Vec3)) {
            console.error("position must be an instance of pc.Vec3");
        }
        if (radius <= 0) {
            console.error("invalid radius")
        }
        if (Object.values(MissionLocationType).indexOf(type) < 0) {
            console.error(`${type} is not a valid mission location type`);
        }

        this.position = position;
        this.radius = radius;
        this.type = type;

    }
};

class MissionReward {
    constructor(type, value) {
        this.type = type;
        this.value = value;
    }

    serialize() {
        return {
            type: this.type,
            value: this.value
        }
    }

    deserialize(data) {

    }
}

class MissionManager {
    constructor(app) {
        this.app = app;
        this.missions = [];
        this.activeMissions = []; // up to ?3? active missions
        this.currentMission = -1; // the activated and currently displayed mission
        
        this.missionToBeActivated = -1; // an active mission that the player is inside the trigger zone for
        
        // record which missions are complete so we don't repeat them too often
        this.missionRecord = [];

        this.locationManager = new MissionLocationManager(this.app);

        // fill class lookup
        MissionClass[MissionTypes.PICKUP_DROPOFF] = PickupDropOffMission;
        MissionClass[MissionTypes.CHECKPOINT_RACE] = CheckpointRaceMission;
        MissionClass[MissionTypes.HIT_X_THINGS] = HitXThingsMission;
        MissionClass[MissionTypes.BONUS_STAT_MISSION] = BonusStatMission
        MissionClass[MissionTypes.STUNT_MISSION] = StuntMission;

        // listen for ui triggering mission start
        this.app.on("mission:triggerStart", () => {
            this.startMission(this.missionToBeActivated);
            this.missionToBeActivated = -1;
            this.app.fire("ui:hidebutton", "activatemission");
        });

        // listen for player death
        this.app.on("vehicle:died", () => {
            if (this.currentMission >= 0) {
                this.completeCurrentMission(false);
            }
        })

        this.storage = new GameStorage("mm");
        this.storage.load();
    }

    addMission(mission) {
        this.missions.push(mission);
        this.missionRecord.push(false); // not complete
    }

    getCurrentMission() {
        if (this.currentMission >= 0) {
            return this.missions[this.currentMission];
        }
        return null;
    }

    getActiveMissions(type) {
        if (type) {
            return this.activeMissions.map((idx) => {return this.missions[idx];}).filter((mission) => { return (mission.started && mission.type === type); });
        } else {
            return this.activeMissions.map((idx) => {return this.missions[idx];}).filter((mission) => { return (mission.started); });
        }
    }

    // start recording progress against this mission, start timers, display status
    startMission(i) {
        if (this.currentMission >= 0 && this.missions[i].triggeredStart) {
            console.error("can't have two missions active at once");
            return;
        }

        this.missions[i].startMission();
        this.app.fire("mission:start", this.missions[i]);

        // only the triggered missions get set as "current" - which means they are displayed on screen constantly
        if (this.missions[i].triggeredStart) {
            this.app.poki.trackEvent('missions', 'start', this.missions[i].name);
            this.app.fire("mission:ui:start", this.missions[i]);    
            this.currentMission = i;
            this.hideActiveMissions();
            
            // if (this.missions[i].hasLocations) {
            //     let position = this.missions[i].locations[0].position;
            //     this.app.fire("player:teleport", position, this.app.game.vehicle.forward);
            // }
        }
    }

    // add mission to active list
    activateMission(i) {
        this.missionRecord[i] = true;
        this.activeMissions.push(i);
        this.missions[i].activateMission();
        if (!this.missions[i].triggeredStart) {
            // this.missions[i].startMission();
            this.startMission(i);
        }
    }

    hideActiveMissions() {
        this.activeMissions.forEach((idx) => {
            if (idx !== this.currentMission) {
                this.missions[idx].hideEnabledLocations();
            }
        });
    }

    showActiveMissions() {
        this.activeMissions.forEach((idx) => {
            this.missions[idx].showEnabledLocations();
        });
    }

    update (dt, playerPosition) {
        for (let i = 0; i < this.activeMissions.length; i++) {
            let missionIdx = this.activeMissions[i];
            let mission = this.missions[missionIdx];
            mission.update(dt, playerPosition);

            if (this.currentMission < 0 && mission.canStart(playerPosition)) {
                this.missionToBeActivated = missionIdx;
                this.app.fire("ui:showbutton", "activatemission");
            } else {
                if (this.missionToBeActivated === missionIdx) {
                    this.app.fire("ui:hidebutton", "activatemission");
                    this.missionToBeActivated = -1;
                }
            }
            
            if (mission.checkCurrentLocation(playerPosition)) {
                mission.markCurrentLocationDone();
                this.app.fire("mission:ui:statuschange", mission);
            }

            if (mission.areSuccessConditionsMet()) {
                this.completeActiveMission(missionIdx, true);                    
            } else if (mission.areFailedConditionsMet()) {
                this.completeActiveMission(missionIdx, false);
            }
        }


        // top up missions
        if (this.missions.length && this.activeMissions.length < 300) {
            let numMissions = this.missionRecord.length;
            let start = Math.floor(pc.math.random(0, numMissions)); // random starting point;
            let idx = start;
            let abort = false;
            while (this.missionRecord[idx]) {
                idx++;
                idx %= numMissions;
                if (idx === start) {
                    abort = true;
                    break;
                }
            }

            if (abort) {
                return;
            } else  {
                if (!this.missions[idx].complete && this.missions[idx].minLevel <= this.app.playerData.getLevel()) {
                    this.activateMission(idx);
                }
            }
            
        }

    }

    completeCurrentMission(success) {
        // let i = this.activeMissions.indexOf(this.currentMission);
        this.completeActiveMission(this.currentMission, success);
    }

    completeActiveMission(index, success) {
        if (this.activeMissions.indexOf(index) < 0) {
            console.error("trying to complete non-active mission");
            return;
        }
        
        // remove from active missions
        this.activeMissions.splice(this.activeMissions.indexOf(index), 1);

        // also current displayed mission
        if (index === this.currentMission) {
            this.showActiveMissions();
            this.currentMission = -1;
        }

        let mission = this.missions[index];
        if (mission) {
            mission.markMissionComplete(success);
            this.app.poki.trackEvent('missions', 'complete', mission.name);
            // this.currentMission = -1;
            this.app.fire("mission:ui:complete", mission);
            if (success) {
                this.app.poki.trackEvent('missions', 'succeed', mission.name);
                this.reward(mission.reward.type, mission.reward.value);
            } else {
                this.app.poki.trackEvent('missions', 'fail', mission.name);
                // penalty?
            }
            
        }

        this.storage.set("status", this.serialize());
        this.storage.save();
    }

    reward(type, value) {
        switch(type) {
            case MissionRewardType.NONE:
                break;
            case MissionRewardType.COINS:
                this.app.playerData.changeCoins(value);
                this.app.fire("toast:coins", value);
            break;
            case MissionRewardType.XP:
                this.app.playerData.changeXp(value);
                this.app.fire("toast:xp", value);
            break;
            case MissionRewardType.HEALTH:
                this.app.playerData.changeHealth(value);
                this.app.fire("toast:health", value);
            break;
            case MissionRewardType.FUEL:
                this.app.playerData.changeFuel(value);
                this.app.fire("toast:fuel", value);
            break;
        }
    }

    loadMissions(missionsData) {
        missionsData.missions.forEach((data, idx) => {
            if (MissionClass[data.type]) {
                let mission = new MissionClass[data.type](this.app);
                mission.deserialize(data);
                this.addMission(mission);
            } else {
                console.error(`Couldn't find a mission of type: ${data.type}`);
            }
        });
        this.deserialize(this.storage.get("status", {}));
    }

    serialize() {
        let data = {};
        
        this.missions.forEach((mission) => {
            data[mission.name] = {
                status: mission.status
            }
        });

        return data;
    }

    deserialize(data) {
        for (let key in data) {
            let mission = this.missions.find((mission) => {return mission.name === key;});
            if (mission) {
                let success = data[key].status === MissionStatus.COMPLETE_SUCCESS;
                let failed = data[key].status === MissionStatus.COMPLETE_FAILED;
                if (success || failed) {
                    mission.markMissionComplete(success);
                }
            }
        }
    }
}