function createColorMaterial(color) {
    const material = new pc.StandardMaterial();
    material.emissive = color;
    material.opacity = 0.5;
    material.useLighting = false;
    material.blendType = pc.BLEND_NORMAL;
    material.update();
    return material;
}

class Selection {
    index = -1;
    type = "point"; // | "tangent"
    handle = null; // entity

    get selected() {
        return this.index >= 0;
    }
    
    selectPoint(i) {
        this.type = "point";
        this.index = i;
    }
    
    selectTangent(i) {
        this.type = "tangent"
        this.index = i;
    }

    deselect() {
        this.index = -1;
        this.handle = null;
    }

    get tangentIndex() {
        return this.type === "tangent" ? this.index : -1;
    }

    get pointIndex() {
        return this.type === "point" ? this.index : -1;
    }

};

class SplineEditor
{
    app = null; // playcanvas app
    camera = null; // active camera component
    canavs = null; // application canvas
    spline = null; // currently selected spline
    selection = new Selection(); // currently selected point in spline
    maxPoints = 32; // max number of points to render
    pointColor = new pc.Color(1,1,0); // color to render point handles
    tangentColor = new pc.Color(1,0,1, 0.5); // color to render tangent handles
    color = new pc.Color(0,1,1); // color to render spline
    _pointMaterial = null; // material used to render points
    _handles = []; // storage for knot spheres
    _handlesInUse = 0;
    gizmoHandler = null; // manage gizmos
    gizmoLayer = null;
    picker = null;
    _ignoreUpdates = false; // flag to ignore position/rotation changes while changing selection

    constructor(app, camera /*camera component*/)
    {
        this.app = app;
        this.camera = camera;
        this.canvas = this.app.graphicsDevice.canvas;

        // create a layer for gizmos to render above everything else
        this.gizmoLayer = this.app.scene.layers.getLayerByName('SplineEditorGizmo');
        if (!this.gizmoLayer) {
            this.gizmoLayer = new pc.Layer({
                name: 'SplineEditorGizmo',
                clearDepthBuffer: true,
                opaqueSortMode: pc.SORTMODE_NONE,
                transparentSortMode: pc.SORTMODE_NONE
            });

            const layers = app.scene.layers;
            layers.push(this.gizmoLayer);
            camera.layers = camera.layers.concat(this.gizmoLayer.id);
        }


        this.spline = null; // the current selection
        this.splines = []; // all splines available

        this.maxPoints = 32;

        // create spheres to use at each knot to be selectable
        // this.knotColor = new pc.Color(1,0,0);
        // this.color = new pc.Color(0,1,0);
        this._pointMaterial = createColorMaterial(this.pointColor);
        this._handles = [];
        for (let i = 0; i < this.maxPoints; i++) {
            const sphere = new pc.Entity(`p{i}`);
            sphere.addComponent('render', {
                type: 'sphere',
                material: this._pointMaterial,
                layers: [this.gizmoLayer.id]
            });
            sphere.setLocalScale(0.1,0.1,0.1);
            sphere.userData = {
                handleIndex: i, // index in handle array
                splineIndex: -1, // index in spline array
                pointIndex: -1, // index in spline points array
                tangentIndex: -1 // index in spline tangents array
            };
            this._handles.push(sphere);
        }

        this.gizmoHandler = new GizmoHandler(this.app, this.camera, this.gizmoLayer);
        this.gizmoHandler.on("position:update", (position) => {
            this.onPositionUpdate(position);
        });
        this.gizmoHandler.on("rotation:update", (rotation) => {
            this.onRotationUpdate(rotation);
        });
        window.addEventListener('pointerdown', (e) => {
            this.onPointerDown(e);
        });
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('keyup', this.onKeyUp.bind(this));
        window.addEventListener('keypress', this.onKeyPress.bind(this));



        // picker
        
        this.picker = new pc.Picker(this.app, this.canvas.clientWidth, this.canvas.clientHeight);

        this.app.on("update", this.update, this);
    }

    // select a spline
    select(spline)
    {
        if (this.spline) {
            this.deselect();
        }

        this.spline = spline;
        this._handlesInUse = 0;
        // enable sphere handle at each point
        this.spline.points.forEach((point, i) => {
            this._handles[this._handlesInUse].setPosition(point);
            this.app.root.addChild(this._handles[this._handlesInUse]);
            this._handles[this._handlesInUse].userData.pointIndex = i;
            this._handlesInUse++;
        });

        this.spline.tangents.forEach((tangent, i) => {
            
            this._handles[this._handlesInUse].setPosition(this.spline.points[i].x + tangent.x,
                                                        this.spline.points[i].y + tangent.y,
                                                        this.spline.points[i].z + tangent.z);
            this.app.root.addChild(this._handles[this._handlesInUse]);
            this._handles[this._handlesInUse].userData.tangentIndex = i;
            this._handlesInUse++;
        });
    }

    deselect() {
        this.deselectHandle();
        for (let i = 0; i < this._handlesInUse; i++) {
            this._handles[i].userData.pointIndex = -1;
            this._handles[i].userData.tangentIndex = -1;
            this._handles[i].reparent(null);
        }
        this._handlesInUse = 0;
    }

    // PRIVATE APIS

    // key event handlers
    onKeyDown (/** @type {KeyboardEvent} */ e) {
        this.gizmoHandler.gizmo.snap = !!e.shiftKey;
        this.gizmoHandler.gizmo.uniform = !e.ctrlKey;

        this.ctrlKeyDown = e.ctrlKey;
    };

    onKeyUp (/** @type {KeyboardEvent} */ e) {
        this.gizmoHandler.gizmo.snap = !!e.shiftKey;
        this.gizmoHandler.gizmo.uniform = !e.ctrlKey;
        
        this.ctrlKeyDown = false;
    };

    onKeyPress (/** @type {KeyboardEvent} */ e) {
        switch (e.key) {
            case '1':
                this.gizmoHandler.switch("translate");
                break;
            case '2':
                this.gizmoHandler.switch("rotate");
                break;
            case '3':
                this.gizmoHandler.switch("scale");
                break;
            case 'A':
                this.addNewControlPoint();
        }
    };

    onPointerDown (e) {
        if (this.gizmoHandler.ignorePicker) {
            return;
        }

        if (this.picker) {
            this.picker.resize(this.canvas.clientWidth, this.canvas.clientHeight);
            this.picker.prepare(this.camera, this.app.scene, [this.gizmoLayer]);
        }

        const selection = this.picker.getSelection(e.clientX - 1, e.clientY - 1, 2, 2);
        if (selection[0]) {
            let entity = selection[0].node
            if(entity.userData) {
                this._ignoreUpdates = true;
                this.gizmoHandler.add(selection[0].node, !e.ctrlKey && !e.metaKey); // show gizmo
                this.selectHandle(entity);
                this._ignoreUpdates = false;
    
            }    
        } else {
            this.gizmoHandler.clear();
            this.deselectHandle();
            return;
        }

    }

    onPositionUpdate (position) {
        if (this._ignoreUpdates) return;
            
        if (this.selection.selected) {
            if (this.selection.type === "point") {
                this.spline.points[this.selection.index].copy(position);
                this.spline.invalidate();
                this.updateHandles();
            } else if (this.selection.type === "tangent") {
                let p = this.spline.points[this.selection.index];
                this.spline.tangents[this.selection.index].set(position.x - p.x, position.y - p.y, position.z - p.z);
                this.spline.invalidate();
            }
            
        }
    }

    onRotationUpdate (rotation) {
        if (this._ignoreUpdates) return;
        console.log(`rotation: ${rotation}`);
    }

    // update all handles to latest spline positions
    updateHandles () {        
        for (let i = 0; i < this._handlesInUse; i++) {
            if (this._handles[i].userData.pointIndex >= 0) {
                this._handles[i].setPosition(this.spline.points[this._handles[i].userData.pointIndex]);
            }
            if (this._handles[i].userData.tangentIndex >= 0) {
                let point = this.spline.points[this._handles[i].userData.tangentIndex];
                let tangent = this.spline.tangents[this._handles[i].userData.tangentIndex];

                let p = this._handles[i].getPosition();
                p.set(point.x + tangent.x, point.y + tangent.y, point.z + tangent.z);
                this._handles[i].setPosition(p);
            }
        }
    }

    // select a knot in the spline
    selectHandle(entity) {
        if (this.selection.selected) {
            this.deselectHandle();
        }
        
        if (entity) {
            if (entity.userData.pointIndex >= 0) {
                this.selection.selectPoint(entity.userData.pointIndex);    
            } else if (entity.userData.tangentIndex >= 0) {
                this.selection.selectTangent(entity.userData.tangentIndex);
            }            
        }
    }
    
    deselectHandle() {
        this.selection.deselect();
    }

    addNewControlPoint() {
        // add a new control point to the end
        if (!this.spline) return;

        let p = new pc.Vec3().copy(this.spline.points[this.spline.size-1]);
        let t = new pc.Vec3().copy(this.spline.tangents[this.spline.size-1])
        t.mulScalar(1.25); // lengthen to avoid creating point exactly on previous tangent control point
        p.add(t);
        t.mulScalar(0.8); // reset tangent
        this.spline.addPoint(p, t);

        // initialize all handles
        this.select(this.spline);
    }


    update (dt) {
        if (this.spline) {
            this.draw(this.spline, this.color, this.tangentColor, 0.05);
        }
    }

    draw(spline, color, tangentColor, step) {
        let tmp1 = new pc.Vec3();
        let tmp2 = new pc.Vec3();
        let incr = step/spline.segments;
        for (let t = 0; t < 1; t += incr) {
            let startPoint = spline.getPointAt(t, tmp1);
            let endPoint = spline.getPointAt(t + incr, tmp2);
            this.app.drawLine(startPoint, endPoint, color);
        }

        // draw tangents
        let num = spline.points.length;
        for (let i = 0; i < num; i++) {
            tmp1.copy(spline.points[i]);
            tmp2.set(spline.tangents[i].x + tmp1.x, spline.tangents[i].y + tmp1.y, spline.tangents[i].z + tmp1.z);
            this.app.drawLine(tmp1, tmp2, tangentColor);
        }
    }

}

// class for handling gizmos
class GizmoHandler extends pc.EventHandler {
    _type = 'translate';
    _gizmos = {};
    _nodes = [];
    //Flag to ignore picker on gizmo pointer events.
    _ignorePicker = false;

    /**
     * @param {pc.AppBase} app - The application.
     * @param {pc.CameraComponent | undefined} camera - The camera component.
     * @param {pc.Layer} layer - The gizmo layer
     */
    constructor(app, camera, layer) {
        super();
        this._gizmos = {
            translate: new pcx.TranslateGizmo(app, camera, layer),
            rotate: new pcx.RotateGizmo(app, camera, layer)
            //,scale: new pcx.ScaleGizmo(app, camera, layer)
        };

        for (const type in this._gizmos) {
            const gizmo = this._gizmos[type];
            gizmo.on(
                'pointer:down', (x,y,meshInstance) => {
                    this._ignorePicker = !!meshInstance;
                }
            );
            gizmo.on('pointer:up', () => {
                this._ignorePicker = false;
            });
            gizmo.on('position:update', (position) => {
                this.fire('position:update', position);                
            });
            gizmo.on('rotation:update', (rotation) => {
                this.fire('rotation:update', rotation);
            });
        }
    }

    get gizmo() {
        return this._gizmos[this._type];
    }

    get ignorePicker() {
        return this._ignorePicker;
    }

    /**
     * Adds single node to active gizmo.
     *
     * @param {pc.GraphNode} node - The node to add.
     * @param {boolean} clear - To clear the node array.
     */
    add(node, clear = false) {
        if (clear) {
            this._nodes.length = 0;
        }
        if (this._nodes.indexOf(node) === -1) {
            this._nodes.push(node);
        }
        this.gizmo.attach(this._nodes);
    }

    /**
     * Clear all nodes.
     */
    clear() {
        this._nodes.length = 0;
        this.gizmo.detach();
    }

    /**
     * Switches between gizmo types
     *
     * @param {string} type - The transform gizmo type.
     */
    switch(type) {
        this.gizmo.detach();
        this._type = type ?? 'translate';
        this.gizmo.attach(this._nodes);
    }

    destroy() {
        for (const type in this._gizmos) {
            this._gizmos[type].destroy();
        }
    }
}