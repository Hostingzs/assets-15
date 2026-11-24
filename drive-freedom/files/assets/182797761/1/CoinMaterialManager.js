var CoinMaterialManager = pc.createScript('CoinMaterialManager');


CoinMaterialManager.attributes.add("tagName", {type:"string"});
CoinMaterialManager.attributes.add("colorMap", {type:"asset", assetType:"texture"});
CoinMaterialManager.attributes.add("start", {"type": "number", default:0.5, min: 0, max: 1});
CoinMaterialManager.attributes.add("end", {"type": "number", default:1, min: 0, max: 1});
CoinMaterialManager.attributes.add("offset", {"type": "number", default:0.25, min: 0, max: 1});
CoinMaterialManager.attributes.add("scale", {"type": "number", default:2, min: 0, max: 10});

// initialize code called once per entity
CoinMaterialManager.prototype.initialize = function() {
    // this.colorMapTexture = this.colorMap.resource;

    this.light = this.app.root.findByName("Directional Light");
    this.lightDir = this.light.forward.clone();

    this.material = new ToonMaterial2(this.app.graphicsDevice);
    
    // this.material.update();

    this.app.on("game:newmodel", (tag) => {
        if (tag === this.tagName) {
            this.applyToModels();
        }
    });

    this.on("attr", (name, value, prev) => {
        this.material.start = this.start;
        this.material.end = this.end;
        this.material.offset = this.offset;
        this.material.scale = this.scale;
    
        this.material.update();
    });
};

CoinMaterialManager.prototype.postInitialize = function () {
    this.material.fogSettings = new FogSettings(this.app.scene.fogStart, this.app.scene.fogEnd, this.app.scene.fogColor);
    this.material.emissiveMap = this.colorMap;
    // this.material.colorMap = this.colorMap;
    this.material.lightDir = this.getLightDir();
    this.material.start = this.start;
    this.material.end = this.end;
    this.material.offset = this.offset;
    this.material.scale = this.scale;
    this.material.update();

    this.applyToModels();
};

CoinMaterialManager.prototype.getLightDir = function () {
    this.lightDir.copy(this.light.forward);
    this.lightDir.set(this.lightDir.x * -1, this.lightDir.y, this.lightDir.z * -1);
    return this.lightDir;
};

// update code called every frame
CoinMaterialManager.prototype.update = function(dt) {
    // this.material.lightDir = this.light.up; this.material.lightDir[1] *= -1; // (-ve y is light direction)
    this.material.lightDir = this.getLightDir();
};

// apply material to all render components tagged "toon"
CoinMaterialManager.prototype.applyToModels = function () {
    let toonModels = this.app.root.findByTag(this.tagName);

    for (let i = 0; i < toonModels.length; i++) {
        if (toonModels[i].render) {
            toonModels[i].render.meshInstances[0].material = this.material;
            // toonModels[i].render.meshInstances.forEach((mi) => {
            //     mi.material = this.material;
            // });
        }
    }

};