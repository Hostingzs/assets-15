// import * as pc from 'playcanvas';
// import { TOON_VERT } from './ToonVert';
// import { TOON_FRAG } from './ToonFrag';
// import {TOON_DIFFUSE_CHUNK} from './ToonDiffuseChunk';

const START_PARAM_IDX = 0;
const END_PARAM_IDX = 1;
const OFFSET_PARAM_IDX = 2;
const SCALE_PARAM_IDX = 3;

class FogSettings {
    constructor(start, end, color) {
        this.start = start,
        this.end = end;
        this.color = [color.r, color.g, color.b];
    }
};

class ToonMaterial extends pc.Material {
    // _colorMapl
    // _lightDir: Array<number>;
    // _parameters: Array<number>;
    
    constructor(graphicsDevice) {
        super();

        this.gd = graphicsDevice;

        this.name = "ToonMaterial";
        // defaults
        this._colorMap = null;
        this._tint = [1,1,1];
        this._properties = [0.5, 1, 0.25, 2];
        this._lightDir = [0,-1,0];        
        this._fogSettings = new FogSettings(1, 1000, new pc.Color(1,1,1));
        
        let vertShader = TOON_VERT;
        let fragShader = "precision " + this.gd.precision + " float;\n" + TOON_FRAG;
        
        let shaderDefinition = {
            attributes: {
                aPosition: pc.SEMANTIC_POSITION,
                aNormal: pc.gfx.SEMANTIC_NORMAL,
                aUv0: pc.SEMANTIC_TEXCOORD0
            },
            vshader: vertShader,
            fshader: fragShader
        }

        this.shader = new pc.Shader(this.gd, shaderDefinition);
        this.blendType = pc.BLEND_NORMAL;
    }

    set fogSettings(fogSettings) {
        this._fogSettings = fogSettings;
    }

    set colorMap(colorMap) {
        this._colorMap = colorMap
    }

    set lightDir (dir) {
        this._lightDir[0] = dir.x;
        this._lightDir[1] = dir.y;
        this._lightDir[2] = dir.z;
    }
    
    get lightDir () {
        return this._lightDir;
    }

    set start (val) {
        this._properties[START_PARAM_IDX] = val;
    }

    set end (val) {
        this._properties[END_PARAM_IDX] = val;
    }

    set offset (val) {
        this._properties[OFFSET_PARAM_IDX] = val;
    }

    set scale (val) {
        this._properties[SCALE_PARAM_IDX] = val;
    }

    update () {
        this.setParameter("fog_color", this._fogSettings.color);
        this.setParameter("fog_start", this._fogSettings.start);
        this.setParameter("fog_end", this._fogSettings.end);

        this.setParameter("uColorTint", this._tint);
        this.setParameter("uColorMap", this._colorMap?.resource);
        this.setParameter("uLightDir", this._lightDir);
        this.setParameter("uProperties", this._properties);
                
        super.update();
    }
}