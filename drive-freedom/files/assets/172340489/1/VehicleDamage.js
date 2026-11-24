let VehicleDamage = pc.createScript("VehicleDamage");

VehicleDamage.attributes.add("renderEntity", {type: "entity"});
VehicleDamage.attributes.add("lightSmokeEntity", {type: "entity"});
VehicleDamage.attributes.add("heavySmokeEntity", {type: "entity"});

VehicleDamage.prototype.initialize = function () {
    this.app.on("vehicle:damage", this.onVehicleDamage, this);
    this.app.on("vehicle:repair", this.onVehicleRepair, this);
    this.app.on("vehicle:damagereset", this.reset, this);
    
    this.entity.on("destroy", this.onDestroy, this);

    let lightTemplate = this.app.assets.find("Light Smoke Particle System", "template");
    let heavyTemplate = this.app.assets.find("Heavy Smoke Particle System", "template");
    this.lightParticles = lightTemplate.resource.instantiate();
    this.heavyParticles = heavyTemplate.resource.instantiate();
    this.entity.addChild(this.lightParticles);
    this.entity.addChild(this.heavyParticles);
    this.lightParticles.enabled = false;
    this.heavyParticles.enabled = false;
};

VehicleDamage.prototype.onDestroy = function () {
    this.app.off("vehicle:damage", this.onVehicleDamage, this);
    this.app.off("vehicle:repair", this.onVehicleRepair, this);
    this.app.off("vehicle:damagereset", this.reset, this);
};


VehicleDamage.prototype.onVehicleDamage = function (amount) {
    this.damage(amount);
};

VehicleDamage.prototype.onVehicleRepair = function (amount) {
    this.app.playerData.changeHealth(amount);
    this.app.fire("toast:health", amount);
    this.updateDamagedState();
};

VehicleDamage.prototype.damage = function(amount) {
    let health = this.app.playerData.getHealth();
    if (health === 0) return;

    this.app.playerData.changeHealth(-amount);
    this.updateDamagedState();

    if (this.app.playerData.getHealth() === 0) {
        // player died
        this.app.fire("vehicle:died");
    }

    // for vehicles with rear doors, open them
    this.entity.fire("reardoors:open");
}


VehicleDamage.prototype.update = function (dt) {

}

VehicleDamage.prototype.updateDamagedState = function () {
    if (!this.renderEntity) {
        console.error(`missing render entity for vehicle damage: ${this.entity.name}`);
    }
    let health = this.app.playerData.getHealth();
    let maxHealth = this.app.playerData.getMaxHealth();
    let status = 0.01 + (health / maxHealth);
    status = Math.min(1, status); // clamp at 1

    // gradually tint the diffuse map
    let tint = status;
    let meshInstances = this.renderEntity.render.meshInstances;
    for (let i = 0; i < meshInstances.length; i++) {             
        meshInstances[i].setParameter("uColorTint", [tint, tint, tint]);
    }

    // update smoke particle effect
    if (status <= 0.35) {
        this.lightParticles.enabled = false;
        this.heavyParticles.enabled = true;
    } else if (status <= 0.6) {
        this.lightParticles.enabled = true;
        this.heavyParticles.enabled = false;
    } else if (status > 0.6) {
        this.lightParticles.enabled = false;
        this.heavyParticles.enabled = false;
    } 
}

VehicleDamage.prototype.getTopSpeedFactor = function () {
    let health = this.app.playerData.getHealth();
    let maxHealth = this.app.playerData.getMaxHealth();

    let status = health / maxHealth;
    if (status > 0.75) {
        return 1;
    } else if (status > 0.5) {
        return 0.9;
    } else if (status > 0.25) {
        return 0.75;
    } else if (status > 0) {
        return 0.5;
    } else {
        return 0;
    }
}

VehicleDamage.prototype.reset = function () {
    let maxHealth = this.app.playerData.getMaxHealth()
    this.app.playerData.setHealth(maxHealth);
    this.updateDamagedState();
}