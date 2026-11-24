var CheckpointVfx = pc.createScript('CheckpointVfx');

CheckpointVfx.attributes.add('color', {
    type: 'rgb',
    title: 'Color',
    default: [1,1,0]
});

CheckpointVfx.attributes.add('vs', {
    type: 'asset',
    assetType: 'shader',
    title: 'Vertex Shader'
});

CheckpointVfx.attributes.add('fs', {
    type: 'asset',
    assetType: 'shader',
    title: 'Fragment Shader'
});

CheckpointVfx.attributes.add('gradientMap', {
    type: 'asset',
    assetType: 'texture',
    title: 'Gradient'
});

CheckpointVfx.attributes.add('noiseMap', {
    type: 'asset',
    assetType: 'texture',
    title: 'Noise Map'
});

CheckpointVfx.attributes.add('speed', {
    type: 'number',
    title: 'Speed',
    default: 1
});

// initialize code called once per entity
CheckpointVfx.prototype.initialize = function() {
    this.time = 0;

    var app = this.app;
    var gd = app.graphicsDevice;

    var gradientTexture = this.gradientMap.resource;
    var noiseTexture = this.noiseMap.resource;

    var vertexShader = this.vs.resource;
    var fragmentShader = "precision " + gd.precision + " float;\n";
    fragmentShader = fragmentShader + this.fs.resource;

    // A shader definition used to create a new shader.
    var shaderDefinition = {
        attributes: {
            aPosition: pc.SEMANTIC_POSITION,
            aUv0: pc.SEMANTIC_TEXCOORD0
        },
        vshader: vertexShader,
        fshader: fragmentShader
    };

    // Create the shader from the definition
    this.shader = new pc.Shader(gd, shaderDefinition);

    // Create a new material and set the shader
    this.material = new pc.Material();
    this.material.name = "checkpoint";
    this.material.shader = this.shader;
    this.material.blendType = pc.BLEND_ADDITIVEALPHA;
    this.material.cull = pc.CULLFACE_NONE;
    this.material.depthWrite = false;

    // Set the initial time parameter
    this.material.setParameter('uTime', 0);
    this.material.setParameter('uColor', [this.color.r, this.color.g, this.color.b]);

    // Set the diffuse texture
   this.material.setParameter('uGradientMap', gradientTexture);

    // Use the "clouds" texture as the height map property
    this.material.setParameter('uNoiseMap', noiseTexture);

//    this.material.update();

    // Replace the material on the model with our new material
    var renders = this.entity.findComponents('render');

    for (var i = 0; i < renders.length; ++i) {
        var meshInstances = renders[i].meshInstances;
        for (var j = 0; j < meshInstances.length; j++) {
            meshInstances[j].material = this.material;
        }
    }
};

// update code called every frame
CheckpointVfx.prototype.update = function(dt) {
    this.time += this.speed * dt;

    // Loop 0->1
    // if (this.time > 1) {
    //     this.time -= 1;
    // }

    // Update the time value in the material
    this.material.setParameter('uTime', this.time);
};

// swap method called for script hot-reloading
// inherit your script state here
// CheckpointVfx.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// https://developer.playcanvas.com/en/user-manual/scripting/