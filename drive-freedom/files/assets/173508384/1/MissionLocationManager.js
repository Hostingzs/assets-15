class MissionLocationManager {
    constructor(app) {
        this.app = app;

        this.entities = new Map();
        this.used = new Map();
        Object.values(MissionLocationType).forEach((type) => {
            let entities = this.app.root.findByTag(`location:${type}`);
            this.entities.set(type, entities);
            this.used.set(type, entities.map((e) => {return false;})); // create used array
        });        
    }
    
    get(type, idx) {
        return this.entities.get(type)[idx];
    }

    allocate(type) {
        let used = this.used.get(type);
        let idx = -1;
        for (var i = 0; i < used.length; i++) {
            if (!used[i]) {
                idx = i;
                break;
            }
        }
        if (idx >= 0) {
            used[idx] = true;
            return idx;
        } else {
            return -1;
        }
    }

    release(type, idx) {
        this.used.get(type)[idx] = false;
    }
}