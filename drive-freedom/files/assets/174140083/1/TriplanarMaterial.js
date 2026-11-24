let TriplanarMaterial = pc.createScript("TriplanarMaterial");

// let DIFFUSE_TRIPLANAR = `
// #ifdef MAPCOLOR
// uniform vec3 material_diffuse;
// #endif

// uniform sampler2D texture_xDiffuseMap;
// uniform sampler2D texture_yDiffuseMap;
// uniform sampler2D texture_zDiffuseMap;

// void getAlbedo() {
//     dAlbedo = vec3(1.0);

//     // Tri-planar projection mapping; use absolute value of normal as texture weights
//     vec3 blend = vec3(abs(dNormalW.x), abs(dNormalW.y), abs(dNormalW.z));

//     // make sure the weights sum up to 1 (divide by sum of x+y+z)
//     blend /= dot(blend, vec3(1.0, 1.0, 1.0));

//     // read the three texture projections, for x,y,z axes
//     vec3 cx, cy, cz;
//     float px = vPositionW.x;
//     float py = vPositionW.y;
//     float pz = vPositionW.z;

//     float texPosx = 0.0;
//     float texPosy = 0.0;
//     float texPosz = 0.0;

//     float texSizex = 1.0;
//     float texSizey = 1.0;
//     float texSizez = 1.0;


//     cx = addAlbedoDetail(texture2D(texture_xDiffuseMap, vec2(pz + texPosz, py + texPosy) / texSizex).rgb);
//     cy = addAlbedoDetail(texture2D(texture_yDiffuseMap, vec2(px + texPosx, pz + texPosz) / texSizey).rgb);
//     cz = addAlbedoDetail(texture2D(texture_zDiffuseMap, vec2(px + texPosx, py + texPosy) / texSizez).rgb);

//     // vec3 albedoBase = $DECODE(texture2DBias($SAMPLER, $UV, textureBias)).$CH;
//     // dAlbedo *= addAlbedoDetail(albedoBase);
    
//     // blend the textures based on weights
//     dAlbedo = cx * blend.x + cy * blend.y + cz * blend.z;

// #ifdef MAPVERTEX
//     dAlbedo *= gammaCorrectInput(saturate(vVertexColor.$VC));
// #endif
// }
// `;

TriplanarMaterial.attributes.add("diffuseChunkAsset", {type:"asset", assetType:"shader"});
TriplanarMaterial.attributes.add("xTexture", {type: "asset", assetType: "texture"});
TriplanarMaterial.attributes.add("yTexture", {type: "asset", assetType: "texture"});
TriplanarMaterial.attributes.add("zTexture", {type: "asset", assetType: "texture"});

TriplanarMaterial.attributes.add("material", {type: "asset", assetType:"material"});

TriplanarMaterial.prototype.initialize = function () {
    if (!this.entity.render) return;

    // let meshInstances = this.entity.render.meshInstances;
    // meshInstances.forEach( (mi) => {
    //     mi.material.chunks.diffusePS = this.diffuseChunk;
    //     mi.material.setParameter("texture_xDiffuseMap", this.xTexture.resource);
    //     mi.material.setParameter("texture_yDiffuseMap", this.yTexture.resource);
    //     mi.material.setParameter("texture_zDiffuseMap", this.zTexture.resource);
    //     mi.material.update();
    // });
    this.material.resource.chunks.diffusePS = this.diffuseChunkAsset.resource;
    this.material.resource.setParameter("texture_xDiffuseMap", this.xTexture.resource);
    this.material.resource.setParameter("texture_yDiffuseMap", this.yTexture.resource);
    this.material.resource.setParameter("texture_zDiffuseMap", this.zTexture.resource);
    this.material.resource.update();

    this.app.assets.on(`load:${this.diffuseChunkAsset.id}`, (asset) => {
        // this.material.resource.chunks.diffusePS = asset.resource;
        // this.material.resource.update();
    });
};

TriplanarMaterial.prototype.update = function (dt) {
    if (!this.entity.render) return;

    let meshInstances = this.entity.render.meshInstances;

    meshInstances.forEach( (mi) => {
        mi.setParameter("texture_xDiffuseMap", this.xTexture.resource);
        mi.setParameter("texture_yDiffuseMap", this.yTexture.resource);
        mi.setParameter("texture_zDiffuseMap", this.zTexture.resource);
    });
};