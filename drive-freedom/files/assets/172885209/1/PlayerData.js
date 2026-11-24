const MAX_LEVELS = 20;
// store and manage player stats, current data (damage, fuel, etc)
class PlayerData extends pc.EventHandler {
    constructor() {
        super();

        this.health = 0;
        this.maxHealth = 0;
        this.fuel = 0;
        this.maxFuel = 0;
        this.xp = 0;
        this.coins = 0;
        this.level = 1;
        this.requirements = [];
        this.vehicles = [];
        this.createRequirements();
    
    }
    
    createRequirements() {
        this.requirements[0] = 0;
        this.requirements[1] = 1000;
        for (let i = 2; i < MAX_LEVELS; i++) {
            this.requirements[i] = this.requirements[i-1] + (1000*(i));
        }
    }

    setHealth (v) {
        let change = v - this.health;
        this.health = v;
        this.fire("healthchange", this.health, change);
        this.fire("change");
    }

    getHealth () {
        return this.health;
    }

    changeHealth(value) {
        this.health += value;
        if (this.health > this.maxHealth) {
            value = this.maxHealth - (this.health - value);
            this.health = this.maxHealth;
        }
        if (this.health < 0) {
            this.health = 0;
        }

        this.fire("healthchange", this.health, value);
        this.fire("change");
    }

    setMaxHealth (v) {
        let change = v - this.maxHealth;
        this.maxHealth = v;
        this.fire("maxhealthchange", this.maxHealth, change);
        this.fire("change");
    }

    getMaxHealth () {
        return this.maxHealth;
    }


    setFuel (v) {
        let change = v - this.fuel;
        this.fuel = v;
        this.fire("fuelchange", this.fuel, change);
        this.fire("change");
    }

    getFuel () {
        return this.fuel;
    }

    changeFuel(value) {
        this.fuel += value;
        if (this.fuel > this.maxFuel) {
            value = this.maxFuel - (this.fuel - value);
            this.fuel = this.maxFuel;
        }
        if (this.fuel < 0) {
            this.fuel = 0;
        }
        this.fire("fuelchange", this.fuel, value);
        this.fire("change");
    }
    
    setMaxFuel (v) {
        let change = v - this.maxFuel;
        this.maxFuel = v;
        this.fire("maxfuelchange", this.maxFuel, change);
        this.fire("change");
    }

    getMaxFuel () {
        return this.maxFuel;
    }

    setXp (v) {
        let change = v - this.xp;
        this.xp = v;
        this.fire("xpchange", this.xp, change);
        
        this.level = this.calculateLevel();
        this.fire("levelchange", this.level, 0);
        this.fire("change");
    }

    getXp () {
        return this.xp;
    }

    changeXp(value) {
        this.xp += value;
        if (this.xp < 0) {
            this.xp = 0;
        }
        this.fire("xpchange", this.xp, value);
    
        if (this.level < MAX_LEVELS) {
            if (this.xp > this.requirements[this.level]) {
                this.levelUp();
            }    
        }
        this.fire("change");
    }

    getLevel () {
        return this.level;
    }

    calculateLevel() {
        for (let i = 0; i < MAX_LEVELS; i++) {
            if (this.xp < this.requirements[i]) {
                return i;
            }
        }

        return MAX_LEVELS;
    }

    getNextXp() {
        if (this.level < MAX_LEVELS) {
            return this.requirements[this.level]
        } else {
            return this.xp;
        }
    }

    levelUp () {
        let prev = this.level;
        this.level++;
        this.fire("levelup", this.level);
        this.fire("levelchange", this.level, prev);
        this.fire("change");
    }

    setCoins (v) {
        let change = v - this.coins;
        this.coins = v;
        this.fire("coinschange", this.coins, change);
        this.fire("change");
    }

    getCoins () {
        return this.coins;
    }

    changeCoins(value) {
        this.coins += value;
        if (this.coins < 0) {
            this.coins = 0;
        }
        this.fire("coinschange", this.coins, value);
        this.fire("change");
    }

    getVehicles () {
        return this.vehicles;
    }

    addVehicle (vehicle) {
        if (this.vehicles.indexOf(vehicle) === -1) {
            this.vehicles.push(vehicle);
        }
    }

    setCurrentVehicle (vehicle) {
        this.currentVehicle = vehicle;
        this.fire("change");
    }

    getCurrentVehicle () {
        return this.currentVehicle;
    }
    
    serialize () {
        let data = {
            "version": 1,
            "health": this.health,
            "maxHealth": this.maxHealth,
            "fuel": this.fuel,
            "maxFuel": this.maxFuel,
            "xp": this.xp,
            "coins": this.coins,
            "vehicles": this.vehicles,
            "currentVehicle": this.currentVehicle
        }

        return JSON.stringify(data);
    }

    parse (data) {
        data = data || {}
        let output = {};
        
        if (data.version === undefined || data.version === 1) {
            output.health = data.health === undefined ? 120 : data.health;
            output.maxHealth = data.maxHealth === undefined ? 120 : data.maxHealth;
            output.fuel = data.fuel === undefined ? 180 : data.fuel;
            output.maxFuel = data.maxFuel === undefined ? 180 : data.maxFuel;
            output.xp = data.xp || 0;
            output.coins = data.coins || 100;
            output.vehicles = data.vehicles || [];
            output.currentVehicle = data.currentVehicle || null;
        }

        return output;
    }


    deserialize (data) {
        let json = data;
        if (typeof(data) === "string") {
            json = JSON.parse(data);
        }
        json = this.parse(json);

        if (json.health !== undefined) {this.setHealth(json.health);}
        if (json.maxHealth !== undefined) {this.setMaxHealth(json.maxHealth);}
        if (json.fuel !== undefined) {this.setFuel(json.fuel);}
        if (json.maxFuel !== undefined) {this.setMaxFuel(json.maxFuel);}
        if (json.xp !== undefined) {this.setXp(json.xp);}
        if (json.coins !== undefined) {this.setCoins(json.coins);}
        if (json.vehicles !== undefined) {this.vehicles = json.vehicles;}
        if (json.currentVehicle !== undefined) {this.currentVehicle = json.currentVehicle;}
    }
}

