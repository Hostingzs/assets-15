class Mission {
    constructor(app) {
        this.app = app;
        this.name = "";
        this.description = "";
        this.reward = null;

        this.locations = [];
        this.enabledLocations = []; // graphics entities for locations
        this.currentLocation = 0;
        this.numLocations = 0;
        this.maxTime = -1;
        this.currentTime = -1;
        this.active = false;
        this.started = false;
        this.complete = false;
        this.status = MissionStatus.NOT_STARTED;

        this.triggeredStart = false; // if true, first location is a trigger volume, player must initiate mission. Otherwise, missions starts as soon as it is loaded
        this.hasCount = false;
        this.hasTimer = false;
        this.hasLocations = false;
        this.failOnTimer = true; // if true, fail mission when time runs out, if false, succeed mission when time runs out
        this.allLocationsVisible = false;

        this.collisionTag = null;
        this.count = 0;
        this.maxCount = 0;
        this.completedCollisions = [];
        this.uniqueCollisions = false;

        // for stat missions (e.g. drift time, air time, etc)
        this.stats = {};
        this.targetStats = {};
        this.hasStats = false;

        this.things = ["", ""]; // string to describe singular and plural "things" the mission is about

        // internal temps
        this.tmp = new pc.Vec3();
        this.d = new Date();
    }

    // clear all data
    clear() 
    {
        this.locations = [];
        this.numLocations = 0;
        this.currentLocation = 0;
        this.collisionTag = null;
        this.count = 0;
        this.maxCount = 0;
        this.maxTime = -1;
        this.currentTime = -1;
        this.started = false;
        this.complete = false;
        this.status = MissionStatus.NOT_STARTED;
        this.failOnTimer = true;
        this.allLocationsVisible = false;

        this.hasCount = false;
        this.hasTimer = false;
        this.hasLocations = false;

        for (let stat in this.stats) {
            this.stats[stat] = 0;
        }
    }

    serialize() {
        let data = {
            type: this.type,
            name: this.name,
            description: this.description,
            reward: this.reward ? this.reward.serialize() : null,
            locationTypes: [],
            locations: [],
            allLocationsVisible: this.allLocationsVisible,
            maxTime: this.maxTime,
            failOnTimer: this.failOnTimer
        }

        // serialize locations and location types        
        this.locations.forEach((loc) => {
            let type = data.locationTypes.indexOf(loc.type);
            if (type < 0) {
                type = data.locationTypes.push(loc.type);
            }
            data.locations.push([loc.position.x, loc.position.y, loc.position.z, loc.radius, type]);
        })

        return data;
    }


    deserialize(data) {
        let json = data;
        if (typeof(data) === "string") {
            json = JSON.parse(data);
        }

        this.clear();

        this.name = json.name;
        this.description = json.description;
        if (json.reward) {
            this.reward = new MissionReward(json.reward.type, json.reward.value);
        }

        this.minLevel = 0;
        if (json.minLevel) {
            this.minLevel = json.minLevel;
        }

        this.hasLocations = false;
        let locationTypes  = json.locationTypes;
        for (var i = 0; i < json.locations.length; i++) {
            let position = new pc.Vec3(json.locations[i].position[0],json.locations[i].position[1], json.locations[i].position[2]);
            let radius = json.locations[i].radius;
            // let type = ConvertMissionLocationType[json.locations[i].type];
            let type = json.locations[i].type;

            // let position = new pc.Vec3(json.locations[i][0], json.locations[i][1], json.locations[i][2])
            // let radius = json.locations[i][3];
            // let type = locationTypes[json.locations[i][4]];
            this.addLocation(new MissionLocation(position, radius, type));
            this.hasLocations = true;
        }

        if (json.collisionTag) {
            this.collisionTag = json.collisionTag;
        }

        if (json.uniqueCollisions) {
            this.uniqueCollisions = json.uniqueCollisions;
        }
        
        this.hasCount = false;
        if (("count" in json)) {
            this.maxCount = json.count ? json.count : 0; // force null/undefined to 0
            if (this.maxCount) {
                this.hasCount = true;
            }
        }

        if (json.things) {
            this.things = [...json.things];
        }

        this.hasTimer = false;
        if (json.maxTime !== undefined && json.maxTime > 0) {
            this.maxTime = json.maxTime;
            this.hasTimer = true;
            this.failOnTimer = !!json.failOnTimer;
        }

        this.hasStat = false;
        if (json.stats) {
            for (let stat in json.stats) {
                this.targetStats[stat] = json.stats[stat];
                this.stats[stat] = 0;
            }
            this.hasStats = true;
        }
        this.allLocationsVisible = !!json.allLocationsVisible;
        this.triggeredStart = !!json.triggeredStart;
    }

    // reset ready to run mission again
    reset () {
        this.started = false;
        this.complete = false;
        this.currentLocation = 0;
        this.currentTime = this.maxTime;
        this.count = 0;
        this.status = MissionStatus.NOT_STARTED;
        this.completedCollisions = [];
        for (let stat in this.stats) {
            this.stats[stat] = 0;
        }
    }

    update (dt, position) {
        if (!this.started || this.complete) {return;}

        if (this.hasTimer) {
            this.currentTime -= dt;
            if (this.currentTime < 0) {
                this.currentTime = 0;
            }
        }

    }

    addLocation(location) {
        this.locations.push(location);
        this.enabledLocations.push({
            type: MissionLocationType.NONE,
            index: -1,
            entity: null
        });
        this.numLocations++;
    }
    
    activateMission () {
        this.reset();
        this.active = true;

        // show first location as trigger point
        if (this.hasLocations) {
            this.enableLocationEntity(0);
        }
    }

    startMission () {
        this.reset();
        this.started = true;
        this.status = MissionStatus.IN_PROGRESS;
        if (this.hasTimer) {
            this.currentTime = this.maxTime;
        }

        if (this.hasLocations) {
            this.disableLocationEntity(0); // disable the first one used for triggering start
            
            if (this.allLocationsVisible) {
                // enable all locations
                this.locations.forEach((location, idx) => {
                    this.enableLocationEntity(idx);
                });    
            } else {
                // enable first location
                this.enableLocationEntity(0);
            }    
        }
    }

    endMission() {
        // disable all locations
        this.locations.forEach((location, idx) => {
            this.disableLocationEntity(idx);
        });
    }

    enableLocationEntity(locationIndex) {
        let location = this.locations[locationIndex];

        let locMgr = this.app.missionManager.locationManager;
        let idx = locMgr.allocate(location.type);
        if (idx < 0) {
            console.error(`failed to allocate location of type ${location.type}`);
            return;
        }
        let e = locMgr.get(location.type, idx);
        e.enabled = true;
        e.setPosition(location.position);

        this.enabledLocations[locationIndex].entity = e;
        this.enabledLocations[locationIndex].type = location.type;
        this.enabledLocations[locationIndex].index = idx;
    }   

    disableLocationEntity(locationIndex) {
        let locMgr = this.app.missionManager.locationManager;
        let locationDetails = this.enabledLocations[locationIndex];
        if (locationDetails.entity) {
            locationDetails.entity.enabled = false;
            locMgr.release(locationDetails.type, locationDetails.index);
            locationDetails.entity = null;
            locationDetails.index = -1;
            locationDetails.type = MissionLocationType.NONE;
        }
    }

    hideEnabledLocations() {
        this.enabledLocations.forEach((loc) => {
            if (loc.entity) {
                loc.entity.enabled = false;
            }
            
        });
    }

    showEnabledLocations() {
        this.enabledLocations.forEach((loc) => {
            if (loc.entity) {
                loc.entity.enabled = true;
            }
            
        });

    }

    canStart(pos) {
        if (!this.started && this.active && this.triggeredStart && this.hasLocations) {
            let loc = this.locations[0];
            this.tmp.sub2(loc.position, pos);
            return (this.tmp.lengthSq() < loc.radius * loc.radius);    
        }
        return false;
    }

    checkCurrentLocation(pos) {
        if (!this.started) return;

        if (this.hasLocations && this.currentLocation < this.numLocations) {
            let loc = this.locations[this.currentLocation];

            // 2D distance check
            let dx = loc.position.x - pos.x;
            let dz = loc.position.z - pos.z;
            let dist = Math.sqrt(dx * dx + dz * dz);
            return (dist < loc.radius);    
        }
    }

    markCurrentLocationDone() {
        this.locations[this.currentLocation].done = true;
        this.disableLocationEntity(this.currentLocation);

        this.currentLocation++;

        if (!this.allLocationsVisible && this.currentLocation < this.numLocations) {
            // enable next location
            this.enableLocationEntity(this.currentLocation);
        }
    }

    areFailedConditionsMet() {
        if (this.started && this.hasTimer && this.currentTime <= 0 && this.failOnTimer) {
            return true;
        }

        return false;
    }

    markMissionComplete (success) {
        if (success) {
            this.status = MissionStatus.COMPLETE_SUCCESS;
        } else {
            this.status = MissionStatus.COMPLETE_FAILED;
        }
        this.complete = true;
        
        this.endMission();
    }


    getCurrentStatus () {
        // return a text string that will be displayed to show the current status
        let text = this.app.i18n.getText("Checkpoints: ${currentLocation} / ${numLocations}");
        return text.replace("${currentLocation}", this.currentLocation).replace("${numLocations}", this.numLocations);
    }

    getCurrentTime () {
        if (this.hasTimer) {
            this.d.setTime(this.currentTime * 1000);
            return this.d.toISOString().substring(14, 19);
        } else {
            return null;
        }
    }

    hasCurrentLocation() {
        return (this.hasLocations && this.currentLocation < this.numLocations)
    }

    getCurrentLocation() {
        if (this.hasCurrentLocation()) {
            let loc = this.locations[this.currentLocation];
            return loc.position;
        } else {
            return null;
        }
    }

    // call to record that we've collided with an entity
    addCompletedCollision(entity) {
        if (!this.uniqueCollisions || !this.hasCompletedCollision(entity)) {
            if (this.uniqueCollisions) {
                this.completedCollisions.push(entity);
            }
            this.count++;
            this.app.fire("mission:ui:statuschange", this);
        }
    }

    hasCompletedCollision(entity) {
        return (this.completedCollisions.indexOf(entity) >= 0);
    }

    incrementStat(statName, value) {
        if (this.stats[statName] !== undefined) {
            this.stats[statName] += value;
            this.app.fire("mission:ui:statuschange", this);
        } else {
            // ignore unused stat
        }
    }
    
    setMaxStatValue(statName, value) {
        if (this.stats[statName] !== undefined) {
            if (value > this.stats[statName]) {
                this.stats[statName] = value;
                this.app.fire("mission:ui:statuschange", this);
            }
        }
    }
}

class CheckpointRaceMission extends Mission
{
    constructor(name, description) {
        super(name, description);
        this.type = MissionTypes.CHECKPOINT_RACE;
    }
    
    areSuccessConditionsMet() {
        if (!this.started) return false;

        // all locations/checkpoints completed
        if (this.hasLocations && this.currentLocation === this.numLocations) {
            return true;
        }

        return false;
    }


    getCurrentStatus () {
        // return a text string that will be displayed to show the current status
        if (this.started && !this.complete) {
            let text = this.app.i18n.getText("Get to the next checkpoint: ${currentLocation}/${numLocations}");
            return text.replace("${currentLocation}", this.currentLocation).replace("${numLocations}", this.numLocations);
        }

        return this.app.i18n.getText("RACE_COMPLETE");
    }
}


class PickupDropOffMission extends Mission
{
    constructor(name, description) {
        super(name, description);
        this.type = MissionTypes.PICKUP_DROPOFF;
    }

    // setPickupDropoff(pickupPos, pickupRadius, dropoffPos, dropoffRadius) {
    //     this.locations[0] = new MissionLocation(pickupPos, pickupRadius);
    //     this.locations[1] = new MissionLocation(dropoffPos, dropoffRadius);
    //     this.numLocations = 2;
    // }
    areSuccessConditionsMet() {
        if (!this.started) return false;

        // all locations/checkpoints completed
        if (this.hasLocations && this.currentLocation === this.numLocations) {
            return true;
        }

        return false;
    }

    getCurrentStatus () {
        // return a text string that will be displayed to show the current status
        if (this.started && !this.complete) {
            if (this.currentLocation === 0) {
                return this.app.i18n.getText("Pickup the package");
            } else {
                return this.app.i18n.getText("Dropoff the package");
            }
        }

        return this.app.i18n.getText("MISSION_COMPLETE");
    }
}

class HitXThingsMission extends Mission
{
    constructor(name, description) {
        super(name, description);
        this.type = MissionTypes.HIT_X_THINGS;
    }

    areSuccessConditionsMet() {
        if (!this.started) return false;

        // all things collected
        if (this.hasCount && this.count >= this.maxCount) {
            return true;
        }

        return false;
        
    }

    getCurrentStatus () {
        // return a text string that will be displayed to show the current status
        if (this.started && !this.complete) {
            let text = this.app.i18n.getText("Knock down ${things}: ${count}/${maxCount}");
            return text.replace("${things}", this.things[1]).replace("${count}", this.count).replace("${maxCount}", this.maxCount);
        }

        return this.app.i18n.getText("MISSION_COMPLETE");
    }
}


class StuntMission extends Mission
{
    constructor(name, description) {
        super(name, description);
        this.type = MissionTypes.STUNT_MISSION;
    }

    areSuccessConditionsMet() {
        if (!this.started) return false;

        if (this.hasStats) {
            for (let stat in this.stats) {
                if (this.stats[stat] < this.targetStats[stat]) {
                    return false;
                }
            }
        } else {
            return false;
        }

        return true;
        
    }

    getCurrentStatus () {
        // return a text string that will be displayed to show the current status
        if (this.started && !this.complete) {
            let output = [];
            for (let stat in this.stats) {
            //     let SINGLE_OUTPUT = {
            //         'backflip': "You did a back flip!",
            //         'frontflip': "You did a front flip!",
            //         '360': "You did a 360!",
            //         'barrelroll': "You did a barrel roll!"
            //     }

            //     let PLURAL_OUTPUT = {
            //         'backflip': `Backflips: ${this.stats[stat]} of ${this.targetStats[stat]}`,
            //         'frontflip': `Frontflips: ${this.stats[stat]} of ${this.targetStats[stat]}`,
            //         '360': `360s: ${this.stats[stat]} of ${this.targetStats[stat]}`,
            //         'barrelroll': `Barrel rolls: ${this.stats[stat]} of ${this.targetStats[stat]}`
            //     }

                let OUTPUT = {
                    'backflip': "Backflips: ${num} of ${total}",
                    'frontflip': "Frontflips: ${num} of ${total}",
                    '360': "360s: ${num} of ${total}",
                    'barrelroll': "Barrel rolls: ${num} of ${total}"
                }
                let text = this.app.i18n.getText(OUTPUT[stat]);
                output.push(text.replace("${num}", this.stats[stat]).replace("${total}", this.targetStats[stat]));

                // if (this.stats[stat] === 1) {
                //     output.push(SINGLE_OUTPUT[stat]);
                // } else {
                //     output.push(PLURAL_OUTPUT[stat]);
                // }
            }

            return output.join("\n");
        }

        return this.app.i18n.getText("MISSION_COMPLETE");
    }
}

class BonusStatMission extends Mission
{
    constructor(name, description) {
        super(name, description);
        this.type = MissionTypes.BONUS_STAT_MISSION;
    }

    areSuccessConditionsMet() {
        if (!this.started) return false;

        if (this.hasStats) {
            for (let stat in this.stats) {
                if (this.stats[stat] < this.targetStats[stat]) {
                    return false;
                }
            }
        } else {
            return false;
        }

        return true;
        
    }

    getCurrentStatus () {
        // return a text string that will be displayed to show the current status
        if (this.started && !this.complete) {
            let output = [];
            for (let stat in this.stats) {
                let STRINGS = {
                    // "drift": "Earn Drift Bonus. ${this.stats[stat].toFixed(0)} / ${this.targetStats[stat].toFixed(0)}",
                    // "air": "Earn Air Time Bonus. ${this.stats[stat].toFixed(0)} / ${this.targetStats[stat].toFixed(0)}",
                    // "speed": "Earn Speeding Bonus. ${this.stats[stat].toFixed(0)} / ${this.targetStats[stat].toFixed(0)}",
                    // "maxspeed": "Reach ${this.targetStats[stat]} MPH. Current Best: ${this.stats[stat].toFixed(0)} MPH",
                
                
                    "drift": "Earn Drift Bonus. ${current} / ${target}",
                    "air": "Earn Air Time Bonus. ${current} / ${target}",
                    "speed": "Earn Speeding Bonus. ${current} / ${target}",
                    "maxspeed": "Reach ${target} MPH. Current Best: ${current} MPH"
                }
                
                let text = this.app.i18n.getText(STRINGS[stat]);
                output.push(text.replace("${current}", this.stats[stat].toFixed(0)).replace("${target}", this.targetStats[stat].toFixed(0)));
            }
            
            return output.join("\n");
        }

        return this.app.i18n.getText("MISSION_COMPLETE");
    }
}
