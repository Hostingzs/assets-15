let POKI_PLATFORM = window.location.href.includes("poki");
let POKI_DISABLED = !POKI_PLATFORM;
let POKI_READY = false;
let POKI_ERROR = false;

var Poki = pc.createScript("Poki");

Poki.prototype.initialize = function () {
    if (POKI_DISABLED) {
        this.sdk = new MockSdk();
    } else {
        this.sdk = PokiSDK;
    }

    this.initialized = false;
    this.startWhenInitialized = false;
    this.lastAdTime = 0;

    // disable scrolling on poki.com
    window.addEventListener('keydown', ev => {
        if (['ArrowDown', 'ArrowUp', ' '].includes(ev.key)) {
            ev.preventDefault();
        }
    });
    window.addEventListener('wheel', ev => ev.preventDefault(), { passive: false });


    this.started = false;
    // initialize SDK
    this.sdk.init().then(() => {
        this.initialized = true;
        POKI_READY = true;
        
        this.sdk.gameLoadingFinished();

        // handle the case when gameplaystart was called before initialization
        if (this.startWhenInitialized) {
            this.gameplayStart();
        }
    }).catch((e) => {
        console.error(e);
        POKI_ERROR = true;
    });

    this.app.poki = this;
}

// returns time since last ad was shown in seconds
Poki.prototype.timeSinceLastAd = function () {
    return (Date.now() - this.lastAdTime) / 1000;
}

Poki.prototype.gameplayStart = function () {
    if (!this.initialized) {
        this.startWhenInitialized = true;
        return;
    }

    if (!this.started) {
        this.sdk.gameplayStart();
        this.started = true;    
    }
};

Poki.prototype.gameplayStop = function () {
    if (this.started) {
        this.sdk.gameplayStop();
        this.started = false;    
    }
};

Poki.prototype.startCommercialBreak = async function () {
    let p = new Promise((resolve, reject) => {
        // call SDK stop func before commercial starts
        // this._onGameStop();
        this.gameplayStop();

        this.sdk.commercialBreak(() => {
            // this.app.fire("game:pause");
           this.app.fire("game:ad:start");
            // you can pause any background music or other audio here
        }).then(() => {
            console.log("Commercial break finished, proceeding to game");
            // if the audio was paused you can resume it here (keep in mind that the function above to pause it might not always get called)
            // continue your game here
            // this.app.fire("game:unpause");
            this.app.fire("game:ad:stop");
            this.lastAdTime = Date.now();
            resolve();
        });
    });

    return p;
};

Poki.prototype.startRewardedBreak = async function (override) {
    let p = new Promise((resolve, reject) => {
        // pause your game here if it isn't already
        // this._onGameStop();
        this.gameplayStop();

        this.sdk.rewardedBreak(() => {
            // you can pause any background music or other audio here
            // this.app.fire("game:pause");
            this.app.fire("game:ad:start");
        }).then((success) => {
            if (override !== undefined) {
                success = override;
            }
            
            this.app.fire("game:reward", success);
            console.log("Rewarded break finished, proceeding to game");
            // this.app.fire("game:unpause");
            this.app.fire("game:ad:stop");
            this.lastAdTime = Date.now();
            resolve(success);
        });
    });

    return p;
  
};


// Poki.prototype._onGameStart = function () {
//     if (!this.started) {
//         this.sdk.gameplayStart();
//         this.started = true;    
//     }
// };

// Poki.prototype._onGameStop = function () {
//     if (this.started) {
//         this.sdk.gameplayStop();
//         this.started = false;    
//     }
// };

Poki.prototype.trackEvent = function (category, action, label) {
    this.sdk.measure(category, action, label);
}