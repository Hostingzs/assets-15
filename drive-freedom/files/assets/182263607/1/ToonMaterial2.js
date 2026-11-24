class ToonMaterial2 extends pc.StandardMaterial {

    constructor(graphicsDevice) {
        super();
        this._properties = [0.5, 1, 0.25, 2];
        this._lightDir = [0,-1,0];        
        this._emissiveMapAsset = null;
        // const options = new pc.LitOptions();
        
        // this.shadingModel = pc.SPECULAR_BLINN;
        // options.useSpecular = false;
        // options.useMetalness = false;
        // options.occludeSpecular = 1;
        // options.reflectionSource = 'envAtlas';
        // options.reflectionEncoding = assets.helipad.resource.encoding;
        // options.ambientSource = 'envAtlas';
        // options.ambientEncoding = assets.helipad.resource.encoding;
        // options.clusteredLightingEnabled = app.scene.clusteredLightingEnabled;
        // options.normalMapEnabled = true;
        // options.useSpecularColor = true;
        // options.useSpecularityFactor = true;
        // options.fog = pc.FOG_LINEAR;
        // this.useSpecular = false;
        this.useLighting = false;
        // this.noShadow = false;
        this.useSpecular = false;
        // this.shaderChunk = TOON_DIFFUSE_CHUNK;

        this.diffuse = new pc.Color(0,0,0);

       this.chunks.emissivePS = TOON_DIFFUSE_CHUNK;        
        
    }

    clone() {
        let m = super.clone();
        m.emissiveMap = this.emissiveMap;
        m._lightDir = this._lightDir;
        m.start = this.start;
        m.end = this.end;
        m.offset = this.offset;
        m.scale = this.scale;
        
        return m;
    }

    get lightDir () {
        return this._lightDir;
    }

    set lightDir (dir) {
        this._lightDir[0] = dir.x;
        this._lightDir[1] = dir.y;
        this._lightDir[2] = dir.z;
    }

    get emissiveMap() {
        return this._emissiveMapAsset;
    }

    set emissiveMap (diffuseMapAsset) {
        this._emissiveMapAsset = diffuseMapAsset;
    }

    get start() {
        return this._properties[0];
    }

    set start (val) {
        this._properties[0] = val;
    }

    get end() {
        return this._properties[1];
    }

    set end (val) {
        this._properties[1] = val;
    }

    get offset() {
        return this._properties[2];
    }

    set offset (val) {
        this._properties[2] = val;
    }

    get scale() {
        return this._properties[3];
    }

    set scale (val) {
        this._properties[3] = val;
    }

    update() {
        this.setParameter("uLightDir", this._lightDir);
        this.setParameter("uProperties", this._properties);
        this.setParameter("texture_diffuseMap", this._emissiveMapAsset.resource);

        // this.chunks.diffusePS = TOON_DIFFUSE_CHUNK;
        super.update();
    }
}