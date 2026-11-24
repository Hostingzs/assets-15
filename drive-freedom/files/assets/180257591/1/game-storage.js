class GameStorage {
    constructor (key) {
        this.data = {};
        this.storageKey = `df:${key}`;
    }

    set(key, value) {
        this.data[key] = value;
    }

    get(key, defaultValue) {
        if (this.data.hasOwnProperty(key)) {
            return this.data[key];
        } else {
            return defaultValue;
        }
    }

    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        } catch(e) {
            console.log(e);
        }        
    }

    load() {
        try {
            this.data = JSON.parse(localStorage.getItem(this.storageKey)) || {};
        } catch(e) {
            console.log(e);
        }
    }
}