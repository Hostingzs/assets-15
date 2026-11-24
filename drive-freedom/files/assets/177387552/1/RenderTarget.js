var RenderTarget = pc.createScript('renderTarget');

// initialize code called once per entity
RenderTarget.prototype.initialize = function() {
    let texNTarg = this.createTarget();
    this.entity.camera.renderTarget = texNTarg[1];

    let asset = this.app.assets.find("RT Material");
    let mat = asset.resource;
    mat.emissiveMap = texNTarg[0];
    // mat.update();
};

RenderTarget.prototype.createTarget = function () {
    let gd = this.app.graphicsDevice;
    gd.canvas.imageRendering = "crisp-edges";
    gd.canvas.imageRendering = "pixelated";
    let screenWidth = gd.canvas.width;
    let screenHeight = gd.canvas.height;
    let width = 540;//384;
    let ratio = screenHeight / screenWidth;
    let height = Math.floor(ratio * width);

    console.log(`Creating render target: ${width}x${height}. Screen is: ${screenWidth}x${screenHeight}`);
    console.log(`Graphics Device: ${gd.width}x${gd.height}. Device Ratio: ${gd.maxPixelRatio}`);

    let plane = this.app.root.findByName("Render Plane");
    let scale = plane.getLocalScale();
    plane.setLocalScale(scale.z / ratio, 1, scale.z);
    
    var colorBuffer = new pc.Texture(this.app.graphicsDevice, {
        width: width,
        height: height,
        format: pc.PIXELFORMAT_R8_G8_B8,
        autoMipmap: false,
        minFilter: pc.FILTER_POINT,
        magFilter: pc.FILTER_POINT
    });

    const renderTarget = new pc.RenderTarget({
        colorBuffer: colorBuffer,
        depth: true,
        flipY: true,
    });

    return [colorBuffer, renderTarget];
};

// update code called every frame
RenderTarget.prototype.update = function(dt) {

};

// swap method called for script hot-reloading
// inherit your script state here
// RenderTarget.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// https://developer.playcanvas.com/en/user-manual/scripting/