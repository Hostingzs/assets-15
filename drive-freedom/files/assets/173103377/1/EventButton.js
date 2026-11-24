let EventButton = pc.createScript("EventButton");

EventButton.attributes.add("name", {type:"string"});
EventButton.attributes.add("value", {type:"string"});

EventButton.prototype.initialize = function () {
    if (this.entity.button) {
        this.entity.button.on("click", this.onClick, this);
    } else {
        this.entity.element.on("click", this.onClick, this);
    }    
}

EventButton.prototype.onClick = function (e) {
    this.app.fire("ui:button:click:*", this.name, this.value);
    this.app.fire(`ui:button:click:${this.name}`, this.value);

    e.event.preventDefault();
    e.stopPropagation();
}

