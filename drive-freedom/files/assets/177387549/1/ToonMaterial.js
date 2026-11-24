// var ToonMaterial = pc.createScript('toonMaterial');

// ToonMaterial.attributes.add("fragShader", {type:"asset", assetType:"shader"});
// ToonMaterial.attributes.add("vertShader", {type:"asset", assetType:"shader"});
// ToonMaterial.attributes.add("color", {type:"rgb"});
// ToonMaterial.attributes.add("colorMap", {type:"asset", assetType:"texture"});
// ToonMaterial.attributes.add("start", {"type": "number", default:0, min: 0, max: 1});
// ToonMaterial.attributes.add("end", {"type": "number", default:1, min: 0, max: 1});
// ToonMaterial.attributes.add("scale", {"type": "number", default:1, min: 0, max: 10});
// ToonMaterial.attributes.add("offset", {"type": "number", default:1, min: 0, max: 1});

// // initialize code called once per entity
// ToonMaterial.prototype.initialize = function() {
//     this.fragShaderSrc = this.fragShader.resource;
//     this.vertShaderSrc = this.vertShader.resource;
//     this.colorMapTexture = this.colorMap.resource;

//     this.light = this.app.root.findByName("Directional Light");

//     this.material = this.createMaterial(this.fragShaderSrc, this.vertShaderSrc);

//     // update for model asset
//     // this.entity.render.material = this.material;

//     this.entity.render.meshInstances.forEach((mi) => {
//         mi.material = this.material;
//     });

//     this.lightDir = [];
//     this.colorArr = [];
//     this.properties = [];

// };

// // update code called every frame
// ToonMaterial.prototype.update = function(dt) {
//     let f = this.light.up;
//     this.lightDir = [-f.x, -f.y, -f.z];
//     this.colorArr = [this.color.r, this.color.g, this.color.b];
//     this.properties = [this.start, this.end, this.offset, this.scale];
//     this.material.setParameter("uLightDir", this.lightDir);
//     this.material.setParameter("uColor", this.colorArr);
//     this.material.setParameter("uProperties", this.properties);
// };

// ToonMaterial.prototype.createMaterial = function (fragShaderSrc, vertShaderSrc) {
//     // Create a new blank material  
//     var material = new pc.Material();
//     // A name just makes it easier to identify when debugging 
//     material.name = "ToonMaterial";
    
//     // Create the shader definition 
//     // dynamically set the precision depending on device.
//     var gd = this.app.graphicsDevice;
//     var fragmentShader = "precision " + gd.precision + " float;\n";
//     fragmentShader = fragmentShader + fragShaderSrc;
    
//     var vertexShader = vertShaderSrc;

//     // A shader definition used to create a new shader.
//     var shaderDefinition = {
//         attributes: {           
//             aPosition: pc.gfx.SEMANTIC_POSITION,
//             aNormal: pc.gfx.SEMANTIC_NORMAL,
//             aUv0: pc.SEMANTIC_TEXCOORD0,
//         },
//         vshader: vertexShader,
//         fshader: fragmentShader
//     };
    
//     // Create the shader from the definition
//     this.shader = new pc.Shader(gd, shaderDefinition);
    
//     // Set blending 
//     material.blendType = pc.BLEND_NORMAL;
//     //material.alphaToCoverage = true;
    
//     // Define our uniforms
//     let f = this.light.up;
//     this.lightDir = [-f.x, -f.y, -f.z];
//     this.colorArr = [this.color.r, this.color.g, this.color.b];
//     material.setParameter("uLightDir", this.lightDir);
//     material.setParameter("uColor", this.colorArr);
//     material.setParameter("uColorMap", this.colorMapTexture);

//     // if(!this.camera){
//     //     this.camera = this.app.root.findByName("Camera").camera;
//     // }
//     // var camera = this.camera; 
//     // var n = camera.nearClip;
//     // var f = camera.farClip;
//     // var camera_params = [
//     //     1/f,
//     //     f,
//     //     (1-f / n) / 2,
//     //     (1 + f / n) / 2
//     // ];
            
//     // material.setParameter('camera_params', camera_params);
//     // material.setParameter('uTime',this.time);
//     // material.setParameter('uSurfaceTexture',this.surfaceTexture.resource);
//     // material.setParameter('isMask',this.isMask);
//     // this.material = material; // Save a reference to this material
    
//     // Apply shader to this material 
//     material.shader = this.shader;
    
//     material.update();
    
//     return material;
// }
// // swap method called for script hot-reloading
// // inherit your script state here
// // ToonMaterial.prototype.swap = function(old) { };

// // to learn more about script anatomy, please read:
// // https://developer.playcanvas.com/en/user-manual/scripting/