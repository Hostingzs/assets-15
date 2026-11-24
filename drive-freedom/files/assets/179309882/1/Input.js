const InputAction = {
    NONE: 0,
    ACCELERATE: 1,
    BRAKE: 2,
    LEFT: 3, 
    RIGHT: 4,
    HANDBRAKE: 5,
    ACTIVATE: 6,
    BACK: 7,
    MISSIONS: 8,
    STORE: 9,
    PAUSE: 10,
    RESPAWN: 11,
    NEXT_TRACK: 12,

    SWITCH_CAR: 100
};

class Input extends pc.EventHandler {
    constructor(app) {
        super();

        this.app = app;
        this.app.keyboard.preventDefault = true;

        this.keyMap = new Map(); // keys -> actions
        this.actionMap = new Map(); // actions -> keys

        this.addAction(pc.KEY_A, InputAction.LEFT);
        this.addAction(pc.KEY_Q, InputAction.LEFT);
        this.addAction(pc.KEY_LEFT, InputAction.LEFT);

        this.addAction(pc.KEY_D, InputAction.RIGHT);
        this.addAction(pc.KEY_RIGHT, InputAction.RIGHT);
        
        this.addAction(pc.KEY_W, InputAction.ACCELERATE);
        this.addAction(pc.KEY_Z, InputAction.ACCELERATE);
        this.addAction(pc.KEY_UP, InputAction.ACCELERATE);

        this.addAction(pc.KEY_S, InputAction.BRAKE);
        this.addAction(pc.KEY_DOWN, InputAction.BRAKE);

        this.addAction(pc.KEY_SPACE, InputAction.HANDBRAKE);
        this.addAction(pc.KEY_E, InputAction.ACTIVATE);
        this.addAction(pc.KEY_SPACE, InputAction.ACTIVATE);
        this.addAction(pc.KEY_1, InputAction.MISSIONS);
        this.addAction(pc.KEY_2, InputAction.STORE);
        this.addAction(pc.KEY_R, InputAction.RESPAWN);
        this.addAction(pc.KEY_T, InputAction.NEXT_TRACK);
        
        this.addAction(pc.KEY_P, InputAction.PAUSE);
        // this.addAction(pc.KEY_ESCAPE, InputAction.PAUSE);
        
        // debug
        this.addAction(pc.KEY_3, InputAction.SWITCH_CAR);

        this.isPressedState = {};
        this.wasPressedState = {};
        
        this.reset();
    
    };

    addAction(key, action) {
        if (action === undefined) {
            throw Error("Undefined action");
        }
        
        if (!this.keyMap.has(key)) {
            this.keyMap.set(key, {
                key: key,
                actions: [action]
            });
        } else {
            let item = this.keyMap.get(key);
            item.actions.push(action);
        }

        if (!this.actionMap.has(action)) {
            this.actionMap.set(action, [key]);
        } else {
            this.actionMap.get(action).push(key);
        }
    }
    
    reset () {
        let actions = Object.keys(InputAction);
        actions.forEach((action) => {
            this.isPressedState[action] = false;
            this.wasPressedState[action] = false;

        });
    };
    
    update (dt) {        
        for (const action of this.actionMap.keys()) {
            let keys = this.actionMap.get(action);

            let isPressed = false;
            let wasPressed = false;

            for (const key of keys) {
                if (this.app.keyboard.isPressed(key)) {
                    isPressed = true;
                }
                if (this.app.keyboard.wasPressed(key)) {
                    wasPressed = true;
                }
                
            }
    
            this.isPressedState[action] = isPressed;
            this.wasPressedState[action] = wasPressed;
                
            if (this.wasPressedState[action]) {
                this.fire(`action:${action}`);
            }

        }
    }
    
    isPressed (action) {
        return this.isPressedState[action];
    }
    
    wasPressed (action) {
        return this.wasPressedState[action];
    }

    listen (action, callback, scope) {
        this.on(`action:${action}`, callback, scope);
    }

    unlisten (action, callback, scope) {
        this.off(`action:${action}`, callback, scope);
    }

}
