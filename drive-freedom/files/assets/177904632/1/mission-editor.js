const InputMode = {
    NONE: 0,
    ADD_MISSION: 1,
    SET_NAME: 2,
    SET_DESCRIPTION: 3,
    SET_REWARD: 4
};

class MissionEditor {
    constructor(app, cameraEntity) {
        this.app = app;
        this.camera = cameraEntity;

        this.missions = [];
        this.selectedMission = -1;
        this.inputMode = 0;
        this.currentString = "";

        this.hitEntity = new pc.Entity();
        this.hitEntity.addComponent("render", {
            type: "sphere"
        });

        this.app.root.addChild(this.hitEntity);

        this._onKeyDown = this.onKeyDown.bind(this);
        this._onKeyUp = this.onKeyUp.bind(this);
        this._onKeyPress = this.onKeyPress.bind(this);

        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
        window.addEventListener('keypress', this._onKeyPress);
    }

    destroy() {
        this.hitEntity.destroy();

        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
        window.removeEventListener('keypress', this._onKeyPress);
    
    }
    update(dt) {
        // fire a ray out from the camera and show the hit point
        let result = this.raycast();
        if (result) {
            this.hitEntity.enabled = true;
            this.hitEntity.setPosition(result.point);
        } else {
            this.hitEntity.enabled = false;
        }
    }

    raycast() {
        let RAY_LENGTH = 100;
        let start = this.camera.getPosition().clone();
        let dir = this.camera.forward.clone();
        let end = this.camera.getPosition().clone().add(dir.mulScalar(RAY_LENGTH));

        let result = this.app.systems.rigidbody.raycastFirst(start, end);
        return result;
    }

    loadMissions() {
        try  {
            let jsonString = window.localStorage.getItem("df:mission-ed:missions");
            let missionsData = JSON.parse(jsonString);
            missionsData.missions.forEach((data) => {
                if (MissionClass[data.type]) {
                    let mission = new MissionClass[data.type](this.app);
                    mission.deserialize(data);
                    this.missions.push(mission);
                } else {
                    console.error(`Couldn't find a mission of type: ${data.type}`);
                }
            });
    
            if (this.missions.length) {
                this.selectedMission = 0;
            }        
            console.log(`loaded missions`);
        } catch (e) {
            console.log(e);
        }
        
    }

    saveMissions() {
        let missionData = {
            missions: []
        };
        
        this.missions.forEach((mission) => {
            missionData.missions.push(mission.serialize());
        });

        let jsonString = JSON.stringify(missionData);
        window.localStorage.setItem("df:mission-ed:missions", jsonString);

        console.log("saved missions");
    }

    addMission(type) {
        this.selectedMission = this.missions.push(new MissionClass[type](this.app));
        this.inputMode = InputMode.NONE;

        console.log(`added mission type: ${type}`);
    }

    // edit a mission
    selectMission(idx) {
        if (idx < this.missions.length) {
            this.selectedMission = idx;
            console.log(`selected mission: ${idx} to edit`);
        }
    }

    selectNextMission() {
        this.selectedMission++;
        if (this.selectedMission >= this.missions.length) {
            this.selectedMission = 0;
        }
    }

    selectPrevMission() {
        this.selectedMission--;
        if (this.selectedMission < 0) {
            this.selectedMission = this.missions.length - 1;
        }
    }

    onKeyDown (evt) {

    }

    onKeyUp (evt) {

    }

    onKeyPress(evt) {
        if (this.inputMode !== InputMode.NONE) {
            if (this.inputMode === InputMode.ADD_MISSION) {
                switch(evt.key) {
                    case '1':
                        this.addMission(MissionTypes.PICKUP_DROPOFF);
                    break;
                    case '2':
                        this.addMission(MissionTypes.CHECKPOINT_RACE);
                    break;
                    default:
                        console.log(`Use number keys to add missions
                            1: PickupDropff
                            2: Checkpoint Race
                        `);
                        this.inputMode = InputMode.NONE;
                }
            }

            if (this.inputMode === InputMode.SET_NAME) {
                if (evt.key === 'Escape') {
                    this.inputMode = InputMode.NONE;
                    console.log("exit name mode");
                    return;
                }
                if (evt.key === 'Enter') {
                    this.inputMode = InputMode.NONE;
                    this.missions[this.selectedMission].name = this.currentString;
                    console.log(`Mission name set to: ${this.missions[this.selectedMission].name}`);
                    return;
                }
                if (evt.key === 'Delete') {
                    this.currentString = this.currentString.slice(0, this,this.currentString.length - 1);
                    return;
                }
                this.currentString = this.currentString + evt.key;
                console.log(`Current name string: ${this.currentString}`);
            }

        } else {
            if (!evt.ctrlKey) return;
        
            switch(evt.key) {
                case 'a':
                    this.inputMode = InputMode.ADD_MISSION;
                    console.log("waiting for mission type");
                break;
                case 'n':
                    if (this.selectedMission >= 0) {
                        this.inputMode = InputMode.SET_NAME;
                        this.currentString = this.selectedMission.name || "";
                        console.log("type mission name, or escape to exit and enter to save");                            
                    }
                break;
                case ']':
                    this.selectNextMission();
                break;
                case '[':
                    this.selectPrevMission();
                break;
                case 'l':
                    this.loadMissions();
                break;
                case 's':
                    this.saveMissions();
                break;
            }
        }    

        evt.stopPropagation();
        evt.preventDefault();
    }
}
