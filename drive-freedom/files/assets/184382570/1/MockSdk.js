class MockSdk {
    constructor() {
        this.initialized = false;
        this.loadingFinished = false;
        this.started = false;
        this.rewardedBreakValue = true;
    }

    init() {
        this.initialized = true;
        let p = new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, 0);
        });
        return p;
    }

    _checkInitialized() {
        if (!this.initialized) {
            throw Error("SDK not initialized");
        }
    }

    _checkLoadingFinished() {
        if (!this.loadingFinished) {
            throw Error("Game not loaded");
        }
    }

    gameLoadingFinished() {
        this._checkInitialized();        
        this.loadingFinished = true;
        console.log("*** gameLoadingFinished");
    }

    gameplayStart() {
        if (this.started) return;

        this._checkInitialized();        
        this._checkLoadingFinished();        
        this.started = true;
        console.log("*** gameplayStart");
    }

    gameplayStop() {
        if (!this.started) return;

        this._checkInitialized();        
        this._checkLoadingFinished();        
        this.started = false;
        console.log("*** gameplayStop");
    }

    // accepts callback that calls immediately before ad plays
    // return promise that resolves when ad is complete
    commercialBreak(callback) {
        this._checkInitialized();
        this._checkLoadingFinished();        

        callback();
        let p = new Promise((resolve, reject) => {
            console.log("*** commercialBreak");
            setTimeout(() => {
                resolve();
            }, 1000);
        });
        return p;
    }

    // accepts callback that calls immediately before ad plays
    // return promise that resolves when ad is complete
    rewardedBreak(callback) {
        this._checkInitialized();        
        this._checkLoadingFinished();        
 
        callback();
        let p = new Promise((resolve, reject) => {
            console.log("*** rewardedBreak");
            setTimeout(() => {
                resolve(this.rewardedBreakValue);
            }, 2000);
        });
        return p;
    }
    
    shareableURL(obj) {
        return "https://example.com/?id=123";
    }

    getURLParam(id) {
        return "123";
    }

    measure(category, action, label) {
        console.log("*** measure", category, action, label);
    }
}