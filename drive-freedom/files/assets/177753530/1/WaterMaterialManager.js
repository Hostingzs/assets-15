var WaterMaterialManager = pc.createScript('WaterMaterialManager');

WaterMaterialManager.attributes.add("tagName", {type:"string"});
WaterMaterialManager.attributes.add("surfaceMap", {type:"asset", assetType:"texture"});
WaterMaterialManager.attributes.add("waterHeight", {type:"number", default: 0});
WaterMaterialManager.attributes.add("start", {"type": "number", default:0.5, min: 0, max: 1});
WaterMaterialManager.attributes.add("end", {"type": "number", default:1, min: 0, max: 1});
WaterMaterialManager.attributes.add("offset", {"type": "number", default:0.25, min: 0, max: 1});
WaterMaterialManager.attributes.add("scale", {"type": "number", default:2, min: 0, max: 10});

// initialize code called once per entity
WaterMaterialManager.prototype.initialize = function() {
    // this.colorMapTexture = this.colorMap.resource;
    this.light = this.app.root.findByName("Directional Light"); // TODO get from game
    this.camera = this.app.root.findByName("Game Camera"); // TODO get from game
    this.material = new WaterMaterial(this.app.graphicsDevice);
};

WaterMaterialManager.prototype.postInitialize = function () {
    this.material.fogSettings = new FogSettings(this.app.scene.fogStart, this.app.scene.fogEnd, this.app.scene.fogColor);
    this.material.surfaceMap = this.surfaceMap;
    this.material.lightDir = this.light.up; this.material.lightDir[1] *= -1; // (-ve y is light direction)
    this.material.start = this.start;
    this.material.end = this.end;
    this.material.offset = this.offset;
    this.material.scale = this.scale;
    this.material.update();

    this.generatePlaneMesh({
        subdivisions: 500,
        width: 1000,
        height: 1000
    });
    // this.applyToModels();
};

// update code called every frame
WaterMaterialManager.prototype.update = function(dt) {
    this.material.incrementTime(dt);
    this.material.setCameraParams(this.camera.camera.farClip, this.camera.camera.nearClip);
    this.material.lightDir = this.light.up; this.material.lightDir[1] *= -1; // (-ve y is light direction)
};

WaterMaterialManager.prototype.generatePlaneMesh = function(options) {
    // 1 - Set default options if none are provided 
    if(options === undefined) {
        options = {subdivisions:100, width:20, height:20};
    }
        
    // 2 - Generate points, uv's and indices 
    var positions = [];
    var uvs = [];
    var indices = [];
    var row, col;
    var normals;

    for (row = 0; row <= options.subdivisions; row++) {
        for (col = 0; col <= options.subdivisions; col++) {
            var position = new pc.Vec3((col * options.width) / options.subdivisions - (options.width / 2.0), this.waterHeight, ((options.subdivisions - row) * options.height) / options.subdivisions - (options.height / 2.0));
            
            positions.push(position.x, position.y, position.z);
            
            uvs.push(col / options.subdivisions, 1.0 - row / options.subdivisions);
        }
    }

    for (row = 0; row < options.subdivisions; row++) {
        for (col = 0; col < options.subdivisions; col++) {
            indices.push(col + row * (options.subdivisions + 1));
            indices.push(col + 1 + row * (options.subdivisions + 1));
            indices.push(col + 1 + (row + 1) * (options.subdivisions + 1));

            indices.push(col + row * (options.subdivisions + 1));
            indices.push(col + 1 + (row + 1) * (options.subdivisions + 1));
            indices.push(col + (row + 1) * (options.subdivisions + 1));
        }
    }
    
    // Compute the normals 
    normals = pc.calculateNormals(positions, indices);

    // Make the actual model
    var node = new pc.GraphNode();
    // var material = new WaterMaterial(this.app.graphicsDevice); //this.CreateWaterMaterial();
   
    // Create the mesh 
    var mesh = pc.createMesh(this.app.graphicsDevice, positions, {
        normals: normals,
        uvs: uvs,
        indices: indices
    });

    var meshInstance = new pc.MeshInstance(node, mesh, this.material);
    
    // Add it to this entity 
    var model = new pc.Model();
    model.graph = node;
    model.meshInstances.push(meshInstance);
    
    this.entity.addComponent('model');
    this.entity.model.model = model;
    this.entity.model.castShadows = false; // We don't want the water surface itself to cast a shadow 
    
    // Set the culling masks 
    var bit = this.isMask ? 3 : 2; 
    meshInstance.mask = 0; 
    meshInstance.mask |= (1 << bit);
};
// apply material to all render components tagged with tagName
WaterMaterialManager.prototype.applyToModels = function () {
    let models = this.app.root.findByTag(this.tagName);

    for (let i = 0; i < models.length; i++) {
        if (models[i].render) {
            models[i].render.meshInstances.forEach((mi) => {
                mi.material = this.material;
            });
        }
    }
};