let StoreUI = pc.createScript('StoreUI');

StoreUI.attributes.add("vehicleContainer", {type: "entity"});
StoreUI.attributes.add("vehicleTile", {type: "asset", assetType: "template"});
StoreUI.attributes.add("nextPageEl", {type: "entity"});
StoreUI.attributes.add("prevPageEl", {type: "entity"});
StoreUI.attributes.add("priceEl", {type: "entity"});
StoreUI.attributes.add("nameEl", {type: "entity"});
StoreUI.attributes.add("descriptionEl", {type: "entity"});
StoreUI.attributes.add("switchButtonEl", {type: "entity"});
StoreUI.attributes.add("buyButtonEl", {type: "entity"});

const ITEMS_PER_PAGE = 6;

StoreUI.prototype.initialize = function () {
    this.vehicleData = null;
    this.uiItems = [];
    this.pages = [];
    this.locked = [];
    this.currPage = 0;
    this.currSelected = -1;
    this.tmpColor = new pc.Color();
    this.tmpVec = new pc.Vec3();

    this.loadData();

    this.nextPageEl.element.on("click", (evt) => {
        this.nextPage();
        evt.stopPropagation();
    });

    this.prevPageEl.element.on("click", (evt) => {
        this.prevPage();
        evt.stopPropagation();
    });

    this.switchButtonEl.button.on("click", (evt) => {
        this.switchVehicle();
        evt.stopPropagation();
    });


    this.buyButtonEl.button.on("click", (evt) => {
        this.buyVehicle();
        evt.stopPropagation();
    });

    this.on("enable", () => {
        this.onShow();
    });

    this.on("disable", () => {
        this.onHide();
    });

    this.app.on("ui:button:click:free-car", this.onClickFreeCar, this);
};

StoreUI.prototype.postInitialize = function () {
    this.onShow();
}

StoreUI.prototype.onShow = function () {
    this.updateLocked();
    this.updateOwned();
    this.updateNavigationButtons();
    this.updateButtonStatus();    
    this.updateSticker();
    this.selectItem(0);
}


StoreUI.prototype.onHide = function () {
    // this.app.game.maybeShowCommercialBreak();
}


StoreUI.prototype.update = function (dt) {
    if (this.app.input.wasPressed(InputAction.LEFT)) {
        let firstIndexOnPage = this.currPage * ITEMS_PER_PAGE;
        
        if (this.currSelected > firstIndexOnPage) {
            this.selectItem(this.currSelected - 1);
        }
    }

    if (this.app.input.wasPressed(InputAction.RIGHT)) {
        let lastIndexOnPage = ITEMS_PER_PAGE + this.currPage * ITEMS_PER_PAGE;
        lastIndexOnPage = Math.min(lastIndexOnPage, this.vehicleData.length);

        if (this.currSelected < (lastIndexOnPage - 1)) {
            this.selectItem(this.currSelected + 1);
        }
    }

    if (this.app.input.wasPressed(InputAction.ACTIVATE)) {
        if (this.switchButtonEl.button.active) {
            this.switchVehicle();
        } else if (this.buyButtonEl.button.active) {
            this.buyVehicle();
        }
    }

    if (this.app.input.wasPressed(InputAction.BACK)) {
        this.entity.enabled = false;
    }
};

StoreUI.prototype.loadData = function () {
    // let asset = this.app.assets.find("vehicles.json");
    // let json = asset.resource;
    let json = this.app.game.vehicleData;
    this.vehicleData = json.vehicles;
//    this.app.vehicleData = this.vehicleData;

    json.vehicles.forEach(vehicle => {
        let item = this.vehicleTile.resource.instantiate("ui-store-item");
        this.uiItems.push(item);
    });


    let numPages = 1 + Math.floor((this.uiItems.length - 1) / ITEMS_PER_PAGE);
    for (let pageIdx = 0; pageIdx < numPages; pageIdx++) {
        let page = new pc.Entity();
        page.addComponent("element", {
            type: "group",
            anchor: [0,0,1,1],
            pivot: [0.5,1],
            margin: [0,0,0,0]
        });
    
        let start = pageIdx * ITEMS_PER_PAGE;
        let end = Math.min(start + ITEMS_PER_PAGE, this.uiItems.length);
        const SPACING = 160;
        let x = 0;
        let y = 160;
        
        for (var i = start; i < end; i++) {
            let idx = i - start;
            x = ((idx % 3) - 1) * SPACING;
            y = 160 + -1 * (Math.floor(idx / 3)) * SPACING;
            let item = this.uiItems[i];
            let thumbnail = this.vehicleData[i].thumbnail;
            let asset = this.app.assets.find(thumbnail, "texture");
            if (asset) {
                let image = item.findByName("Image");
                image.element.textureAsset = asset;
            }
            let priceEl = item.findByName("Price");
            priceEl.element.text = this.vehicleData[i].price;
            page.addChild(item);
            item.setLocalPosition(x, y, 0);
            let handler = this.makeClickHandler(i);
            item.element.on("click", handler, this);

            this.locked[i] = true;
        }    
        this.vehicleContainer.addChild(page);
        page.enabled = false;
        this.pages.push(page);
    }

    // this.updateLocked();
    this.showPage(0);
    this.selectItem(0);
}



StoreUI.prototype.updateOwned = function () {
    let vehicles = this.app.playerData.getVehicles();

    this.uiItems.forEach((item, idx) => {
        let data = this.vehicleData[idx];

        let el = [item.findByName("Price"), item.findByName("Coin Icon")];
        if (vehicles.includes(data.key)) {
            // vehicle is owned; hide price
            el.forEach((el) => {
                el.enabled = false;
            })
        } else {
            // vehicle is not owned; show price
            el.forEach((el) => {
                el.enabled = true;
            })
        }
    });
}

StoreUI.prototype.updateLocked = function () {
    let level = this.app.playerData.getLevel();

    this.uiItems.forEach((item, idx) => {
        let data = this.vehicleData[idx];

        if (data.levelMin !== undefined && data.levelMin > level) {
            this.locked[idx] = true;

            let image = this.uiItems[idx].findByName("Image");
            // let asset = this.app.assets.find("shop-locked.png", "texture");
            let asset = this.app.assets.find(data.thumbnail, "texture");
            image.element.textureAsset = asset;

        } else {
            let image = this.uiItems[idx].findByName("Image");
            let asset = this.app.assets.find(data.thumbnail, "texture");
            image.element.textureAsset = asset;

            this.locked[idx] = false;
        }

    });
}

StoreUI.prototype.updateButtonStatus = function () {
    let item = this.vehicleData[this.currSelected];
    let vehicles = this.app.playerData.getVehicles();
    let owned = (vehicles.indexOf(item.key) > -1);
    let funds = this.app.playerData.getCoins(); 
    let level = this.app.playerData.getLevel();
    let levelMet = (item.levelMin === undefined) || (level >= item.levelMin);
    
    if (levelMet && !owned && funds > item.price) {
        this.buyButtonEl.button.active = true;
    } else {
        this.buyButtonEl.button.active = false;
    }

    if (owned) {
        this.switchButtonEl.button.active = true;
    } else {
        this.switchButtonEl.button.active = false;
    }
}

StoreUI.prototype.updateSticker = function () {
    const FREE_VEHICLE_NAME = 'alcyone';
    const PAGE_INDEX = 0;

    // start disabled
    this.disableSticker();

    let vehicles = this.app.playerData.getVehicles();

    this.uiItems.forEach((item, idx) => {
        let data = this.vehicleData[idx];
        if (data.key === FREE_VEHICLE_NAME && vehicles.indexOf(FREE_VEHICLE_NAME) < 0) {
            if (PAGE_INDEX === this.currPage) {
                this.enableSticker(item);
            }
        }
    });
}

StoreUI.prototype.makeClickHandler = function (idx) {
    return (evt) => {
        console.log("click");
        this.onClick(idx);
        evt.stopPropagation();
    }
}

StoreUI.prototype.onClick = function (idx) {
    // let key = this.vehicleData[idx].key;
    this.selectItem(idx);
}

StoreUI.prototype.prevPage = function () {
    this.hidePage(this.currPage);
    if (this.currPage > 0) {
        this.currPage--;
    }
    this.showPage(this.currPage);
    this.updateNavigationButtons();
    this.updateSticker();
}

StoreUI.prototype.nextPage = function () {
    this.hidePage(this.currPage);
    if (this.currPage < (this.pages.length-1)) {
        this.currPage++;
    }
    this.showPage(this.currPage);
    this.updateNavigationButtons();
    this.updateSticker();
}

StoreUI.prototype.hidePage = function (page) {
    this.pages[page].enabled = false;
}

StoreUI.prototype.showPage = function (page) {
    this.pages[page].enabled = true;
    this.selectItem(page * ITEMS_PER_PAGE);
}

StoreUI.prototype.updateNavigationButtons = function () {
    if (this.currPage === 0) {
        this.prevPageEl.enabled = false;
    } else {
        this.prevPageEl.enabled = true;
    }

    if (this.currPage === (this.pages.length-1)) {
        this.nextPageEl.enabled = false;
    } else {
        this.nextPageEl.enabled = true;
    }
}

StoreUI.prototype.deselectItem = function (idx) {
    this.tmpColor.fromString("#ffffff");
    let backgroundEl = this.uiItems[idx].findByName("Background");
    backgroundEl.element.color = this.tmpColor;
}

StoreUI.prototype.selectItem = function (idx) {
    if (this.currSelected >= 0) {
        this.deselectItem(this.currSelected);
    }
    this.currSelected = idx;

    let item = this.vehicleData[idx];

    this.app.fire("ui:store:selected", item);
    // this.nameEl.element.text = item.name;
    // this.descriptionEl.element.text = item.description;
    this.priceEl.element.text = item.price;
    
    // test if locked...
    if (this.locked[idx]) {
        if (item.levelMin !== undefined) {
            this.descriptionEl.element.text = `Reach Level ${item.levelMin} to unlock`;
        } else {
            this.descriptionEl.element.text = `Locked`;
        }
    }

    let gold = "#E0BF28";
    let red = "#E03128";

    let backgroundEl = this.uiItems[idx].findByName("Background");
    if (this.isOwned(item.key)) {
        this.tmpColor.fromString(gold);
    } else {
        if (this.locked[idx] || item.price > this.app.playerData.getCoins()) {
            this.tmpColor.fromString(red);
        } else {
            this.tmpColor.fromString(gold);
        }    
    }
    backgroundEl.element.color = this.tmpColor;

    this.updateButtonStatus();    
}

StoreUI.prototype.isOwned = function (key) {
    let vehicles = this.app.playerData.getVehicles();
    return (vehicles.indexOf(key) > -1);
}

StoreUI.prototype.switchVehicle = function () {
    let data = this.vehicleData[this.currSelected];
    this.app.poki.trackEvent('gameplay', 'shopswitch', data.key);
    this.app.game.switchVehicle(data.key);
    // close store
    // this.entity.enabled = false;
    this.app.fire("ui:button:click:toggle-vehicles");
}

StoreUI.prototype.buyVehicle = function () {
    let data = this.vehicleData[this.currSelected];

    if (this.app.playerData.getCoins() > data.price) {
        this.app.playerData.addVehicle(data.key);
        this.app.playerData.changeCoins(-data.price);
        
        this.app.poki.trackEvent('gameplay', 'buy', data.key);
    } else {
        // not enough money!
    }

    this.updateButtonStatus();
    this.updateOwned();
}

StoreUI.prototype.enableSticker = function (uiItem) {
    let sticker = this.entity.findByName("Free Sticker Button");
    sticker.enabled = true;
    uiItem.addChild(sticker);

    let OFFSET = 60;
    let pos = new pc.Vec3(OFFSET, OFFSET,0);
    sticker.setLocalPosition(pos);
}

StoreUI.prototype.disableSticker = function () {
    let sticker = this.entity.findByName("Free Sticker Button");
    this.entity.addChild(sticker);
    sticker.enabled = false;
}

StoreUI.prototype.onClickFreeCar = async function () {
    const FREE_VEHICLE_NAME = 'alcyone';

    let success = await this.app.poki.startRewardedBreak();
    let data = this.vehicleData.filter((item) => item.key === FREE_VEHICLE_NAME)[0];
    if (success) {
        this.app.playerData.addVehicle(data.key);
        this.selectItem(this.vehicleData.indexOf(data));
        
        this.updateButtonStatus();
        this.updateOwned();
        this.disableSticker();        
    }
}
