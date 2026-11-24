#ifdef MAPCOLOR
uniform vec3 material_diffuse;
#endif

uniform sampler2D texture_xDiffuseMap;
uniform sampler2D texture_yDiffuseMap;
uniform sampler2D texture_zDiffuseMap;
 
void getAlbedo() {
    dAlbedo = vec3(1.0);
    // Tri-planar projection mapping; use absolute value of normal as texture weights
    vec3 blend = abs(dNormalW); //vec3(abs(dNormalW.x), abs(dNormalW.y), abs(dNormalW.z));
    // make sure the weights sum up to 1 (divide by sum of x+y+z)
    blend /= dot(blend, vec3(1.0, 1.0, 1.0));

    // read the three texture projections, for x,y,z axes
    vec3 cx, cy, cz;
    float px = vPositionW.x;
    float py = vPositionW.y;
    float pz = vPositionW.z;

    // offset
    vec3 offset = vec3(0.5,0.5,0.5);

    // tiling
    vec3 tiling = vec3(2.0,2.0,2.0);

    vec2 uvX = offset.zy - (vPositionW.zy * tiling.x);
    if (dNormalW.x < 0.0) {
        uvX.x *= -1.0;
    }
    vec2 uvY = offset.xz + (vPositionW.xz * tiling.y);
    if (dNormalW.y < 0.0) {
        uvY.x *= -1.0;
    }
    vec2 uvZ = offset.xy - (vPositionW.xy * tiling.z);
    if (dNormalW.z > 0.0) {
        uvZ.x *= -1.0;
    }
    
    cx = texture2D(texture_xDiffuseMap, uvX).rgb;
    cy = texture2D(texture_yDiffuseMap, uvY).rgb;
    cz = texture2D(texture_zDiffuseMap, uvZ).rgb;

    // cx = addAlbedoDetail(texture2D(texture_xDiffuseMap, vec2(pz + texPosz, py + texPosy) / texSizex).rgb);
    // cy = addAlbedoDetail(texture2D(texture_yDiffuseMap, vec2(px + texPosx, pz + texPosz) / texSizey).rgb);
    // cz = addAlbedoDetail(texture2D(texture_zDiffuseMap, vec2(px + texPosx, py + texPosy) / texSizez).rgb);

    // vec3 albedoBase = $DECODE(texture2DBias($SAMPLER, $UV, textureBias)).$CH;
    // dAlbedo *= addAlbedoDetail(albedoBase);
    
    // blend the textures based on weights
    dAlbedo = cx * blend.x + cy * blend.y + cz * blend.z;

#ifdef MAPVERTEX
    dAlbedo *= gammaCorrectInput(saturate(vVertexColor.$VC));
#endif
}