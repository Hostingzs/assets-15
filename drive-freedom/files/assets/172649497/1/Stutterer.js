
function pause(millis) {
    var date = new Date();
    var curDate = null;
    do { curDate = new Date(); }
    while(curDate-date < millis);
}

let Stutter = pc.createScript("Stutter");
Stutter.attributes.add("millis", {type: "number", default: 64});
Stutter.attributes.add("minFrames", {type: "number", default: 10});
Stutter.attributes.add("maxFrames", {type: "number", default: 20});

Stutter.prototype.initialize = function () {
    this.counter = 0;
};

Stutter.prototype.update = function (dt) {
    this.counter++;
    if (this.counter > pc.math.random(this.minFrames, this.maxFrames)) {
        this.counter = 0;    
        pause(this.millis);
    }        
};
