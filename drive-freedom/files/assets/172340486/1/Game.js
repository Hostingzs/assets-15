let Game = pc.createScript("Game");

Game.attributes.add("gameCamera", {type: "entity"});
Game.attributes.add("vehicle", {type: "entity"});

const GameState = {
    LOADING: "loading",
    MENU: "menu",
    PLAYING: "playing",
    DEAD: "dead",
    PAUSED: "paused",
    INGAMEMENU: "ingamemenu",
}


const DEBUG_VEHICLES = [
    "anteros",
    "aniara",
    "alcyone",
    "boar",
    "cupid",
    "quaoar",
    "gaia",
    "clymene",
    "whitevan"
];
let CURRENT_VEHICLE = "anteros"; 
const DEFAULT_VEHICLE = "anteros";

Game.prototype.initialize = function () {
    this.app.game = this;

    this.state = GameState.LOADING;
    this.currentSceneRoot = null;
    
    this.renderer = new AmmoDebugDrawer();

    
    // set locale
    let locale = pc.app.i18n.findAvailableLocale(navigator.language || navigator.userLanguage);
    pc.app.i18n.locale = locale;


    // this.app.systems.rigidbody.maxSubSteps = 20;
    // this.app.systems.rigidbody.fixedTimeStep = 1 / 120;

    // Check if the current browser is an iPad
    let isIpad = /Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints && navigator.maxTouchPoints > 1;

    let controls = this.app.root.findByName("Touch Controls");
    if ((pc.platform.mobile || isIpad) && controls) {
        controls.enabled = true;
    } else if (controls) {
        controls.enabled = false;
    }

    this.adPlaying = false;
    this.paused = false;
    this.inputDisabled = false;

    this.storage = new GameStorage("gs");
    this.storage.load();


    this.vehicle = null;
    this.vehiclePositionalAudio = this.app.root.findByName("Vehicle Positional Audio");

    this.app.playerData = new PlayerData();
    this.app.playerData.deserialize(this.storage.get("playerdata"));
    this.app.playerData.on("change", () => {
        this.storage.set("playerdata", this.app.playerData.serialize());
        this.storage.save();
    });
    this.app.playerData.on("levelup", (level) => {
        this.app.poki.trackEvent('gameplay', 'levelup', level);
    })

    this.app.missionManager = new MissionManager(this.app);

    this.app.input = new Input(this.app);

    this.app.on("ui:button:click:home", () => {
        this.reset();
    });

    this.app.on("vehicle:died", this.onPlayerDied, this);

    // respond to SDK events that pause the game (e.g. Poki) 
    this.app.on("game:pause", this.pause, this);
    this.app.on("game:unpause", this.unpause, this);
    this.app.on("game:ad:start", this.adStart, this);
    this.app.on("game:ad:stop", this.adStop, this);
    this.app.on("game:disableinput", this.disableInput, this);
    this.app.on("game:enableinput", this.enableInput, this);
    
    let SCENE_NAME =  "Island 1";
    // let SCENE_NAME = "Hill Climb";
    this.loadEnvironment(SCENE_NAME, (err) => {
        if (err) console.error(err);
        this.app.playerData.addVehicle(DEFAULT_VEHICLE);
        let currentVehicleName = this.app.playerData.getCurrentVehicle() ? this.app.playerData.getCurrentVehicle() : DEFAULT_VEHICLE;
        try {
            this.switchVehicle(currentVehicleName);
        } catch (e) {
            console.error(`invalid vehicle name found in player data: ${currentVehicleName}`);
            // console.error(`switching to default car: ${DEFAULT_VEHICLE}`);
            this.switchVehicle(DEFAULT_VEHICLE);
        }
    });    
    this.loadMissions();
    this.loadPlayerData();
    this.loadVehicleData();
    
    // timer for running commercials if user is playing for a long time without seeing ads
    // call maybeShowCommercialBreak at good moments (when exiting a menu e.g.)
    this.commercialTimer = 0;
    this.minCommercialTime = 180;


};

Game.prototype.postInitialize = function () {
    this.app.fire("game:setvehicle", this.vehicle);
}

Game.prototype.reset = function () {
    this.app.fire("game:reset");
}

Game.prototype.update = function (dt) {
    
    if (this.freezeFrames > 0) {
         this.freezeFrames--;         
        if (this.freezeFrames <= 0) {
            this.freezeFrames = 0;
            this.app.timeScale = 1.0;
        }
    }
    this.app.input.update(dt);

    if (this.app.input.wasPressed(InputAction.PAUSE)) {
        if (!this.paused) {
            this.pause();
        } else {
            this.unpause();
        }
    }

    if (this.app.input.wasPressed(InputAction.RESPAWN)) {
        this.app.fire("vehicle:damage", 1000);
    }

    if (this.app.input.wasPressed(InputAction.NEXT_TRACK)) {
        this.app.fire("audio:nextTrack");
    }

    const DEBUG_BUILD = false;

    if (DEBUG_BUILD) {
        
        if (this.app.input.wasPressed(InputAction.SWITCH_CAR)) {
            let i = DEBUG_VEHICLES.indexOf(CURRENT_VEHICLE);
            i++;
            i %= DEBUG_VEHICLES.length;
            CURRENT_VEHICLE = DEBUG_VEHICLES[i];
            this.switchVehicle(CURRENT_VEHICLE);
        }

        if (this.app.keyboard.wasPressed(pc.KEY_9)) {
            this.renderer.enabled = !this.renderer.enabled;
        }
    
        if (this.app.keyboard.wasPressed(pc.KEY_M)) {
            this.app.playerData.changeCoins(1000);
        }
    
        if (this.app.keyboard.wasPressed(pc.KEY_I)) {
            this.app.playerData.changeXp(1000);
        }

        
        if (this.app.keyboard.wasPressed(pc.KEY_B)) {
            this.app.playerData.changeFuel(-10);
        }

        if (this.app.keyboard.wasPressed(pc.KEY_G)) {
            this.app.fire("vehicle:damage", 10);
        }
    
        if (this.app.keyboard.wasPressed(pc.KEY_C)) {
            let cam = this.entity.findByName("Game Camera");
            
            cam.script.VehicleCamera.enabled = !cam.script.VehicleCamera.enabled;
            cam.script.flyCamera.enabled = !cam.script.flyCamera.enabled;
        }
    }


    if (this.vehicle) {
        this.app.missionManager.update(dt, this.vehicle.getPosition());
    }

    if (this.missionEditor) {
        this.missionEditor.update(dt);
    }

    if (this.vehiclePositionalAudio && this.vehicle) {
        this.vehiclePositionalAudio.setPosition(this.vehicle.getPosition());
    }

    this.commercialTimer += dt;

};

Game.prototype.maybeShowCommercialBreak = function () {
    // let timeSinceLastAd = this.app.poki.timeSinceLastAd();

    // if (this.commercialTimer > this.minCommercialTime && timeSinceLastAd > this.minCommercialTime) {
        this.app.poki.startCommercialBreak();
    //     this.commercialTimer = 0;
    // }
};

Game.prototype.loadEnvironment = function (sceneName, callback) {
    let sceneItem = this.app.scenes.find(sceneName);
    if (!sceneItem) {
        if (callback) {
            callback(`No scene called ${sceneName}`);
        }
        return;
    }

    // Load the scene hierarchy with a callback when it has finished
    this.app.scenes.loadSceneHierarchy(sceneItem, function (err, loadedSceneRootEntity) {
        if (err) {
            if (callback) {
                callback(err);
            }
        } else {
            // Scene hierarchy has successfully been loaded
            if (this.currentSceneRoot) {
                // destroy old scene
                this.currentSceneRoot.destroy();
            }
            this.currentSceneRoot = loadedSceneRootEntity;
            if (callback) {
                callback(null);
            }
        }
    });
}


Game.prototype.switchVehicle = function (key) {
    let filtered = this.vehicleData.vehicles.filter((data) => {return (data.key === key);});
    if (!filtered.length) {
        throw Error(`Unknown vehicle: ${key}`);
    }
    let vehicleData = filtered[0];
    let carTemplateName = vehicleData.tmpl;
    let asset = this.app.assets.find(carTemplateName, "template");
    if (asset) {
        let car = asset.resource.instantiate();
        this.app.root.addChild(car);

        // update materials
        this.app.fire("game:newmodel", "tooncars");

        // let position;
        // let rotation;
        let old = this.vehicle;

        this.vehicle = car;
        
        if (old) {
            // switch in position
            let position = old.getPosition();
            position.y += 0.5; // avoid ground collision
            let rotation = old.getRotation();    
            this.vehicle.rigidbody.teleport(position, rotation)
        } else {
            // position = new pc.Vec3();
            // rotation = new pc.Quat();
            // let sp = this.app.root.findByName("Spawn Point");
            
            // this.vehicle.rigidbody.teleport(sp.getPosition()
            
        }

        this.app.playerData.setCurrentVehicle(key);
        this.app.poki.trackEvent('gameplay', 'switchvehicle', key);

        this.app.fire("game:setvehicle", this.vehicle);
        this.app.fire("game:switchvehicle", key);
        
        if (old) {
            if (this.app.collectibleRegistry) {
                this.app.collectibleRegistry.unregisterPlayer(old);
            }   
            old.destroy();
        } else {
            this.app.fire("game:respawn", true);
        }

        if (this.app.collectibleRegistry) {
            this.app.collectibleRegistry.registerPlayer(this.vehicle);
        }
    }

}

Game.prototype.freezeFrame = function (num) {
    this.freezeFrames = num;
    this.app.timeScale = 0;
}


Game.prototype.loadMissions = function () {
    let missions = this.app.assets.find("missions.json", "json");
    this.app.missionManager.loadMissions(missions.resource);
}


Game.prototype.loadPlayerData = function () {
    let data = this.storage.get("playerdata");
    if (data === undefined) { data = {}; } // new data
    this.app.playerData.deserialize(data);
}

Game.prototype.loadVehicleData = function () {
    // load vehicle index
    let vehicleDataAsset = this.app.assets.find("vehicles.json");
    this.vehicleData = vehicleDataAsset.resource;
}

Game.prototype.onPlayerDied = function () {
    this.state = GameState.DEAD;
    this.app.fire("game:gameover");
    this.app.fire("ui:showgameover");
}

Game.prototype.pause = function () {
    if (!this.paused) {
        this.paused = true;
        this.app.timeScale = 0;
        this.app.poki.gameplayStop();    
    }
};

Game.prototype.unpause = function () {
    if (this.paused) {
        this.paused = false;
        this.app.timeScale = 1;
        this.app.poki.gameplayStart();
    }
}

Game.prototype.adStart = function () {
    this.adPlaying = true;
    this.app.fire("game:pause");
}

Game.prototype.adStop = function () {
    this.adPlaying = false;
    this.app.fire("game:unpause");
}

Game.prototype.disableInput = function () {
    this.inputDisabled = true;
}

Game.prototype.enableInput = function () {
    this.inputDisabled = false;
}

Game.prototype.isInputDisabled = function () {
    return this.inputDisabled;
}

Game.prototype.isMusicEnabled = function () {
    return this.storage.get("musicEnabled", true);
}

Game.prototype.isFxEnabled = function () {
    return this.storage.get("fxEnabled", true);
}

Game.prototype.setMusicEnabled = function (enabled) {
    this.storage.set("musicEnabled", enabled);
    this.storage.save();
}

Game.prototype.setFxEnabled = function (enabled) {
    this.storage.set("fxEnabled", enabled);
    this.storage.save();
}
