// TODO:
// Recipe view:
//   - Highlight all steps that belong to the subtree of the currently hovered object.
//   - Group ingredients.
//   - Identify reusable ingredients/products.
//   - Improve overall style.
// Goals for automatic recipe generation:
//   - Minimum number of ingredients.
//   - Reuse ingredients as much as possible.
//   - Minimum number of steps.

function DataLoader() {
    this.callbacks = [];
    this.data = {
        maxBiome: 0,
        transitions: [],
        creationTransitions: [],
        usageTransitions: [],
        spriteInfo: [],
        objects: [],
        categories: [],
        techTree: []
    };

    var xhr = new XMLHttpRequest();
    xhr.addEventListener("load", function() {
        this.parseFile(xhr.response);
        this.postprocessData();
        this.loaded = true;
        this.triggerLoaded();
    }.bind(this));
    xhr.addEventListener("error", function() {
        console.error("Oh no!");
    });
    xhr.open("GET", "data.txt");
    xhr.setRequestHeader("Content-Type", "text/plain");
    xhr.send();
}

DataLoader.prototype.addOnLoadCallback = function(func) {
    if (this.loaded) {
        func(this.data);
    } else {
        this.callbacks.push(func);
    }
};

DataLoader.prototype.parseFile = function(body) {
    var mode = "general";
    var lines = body.split("\n");
    var curObj = null;
    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];
        if (mode == "general") {
            if (line == "=====") {
                mode = "transitions";
                continue;
            } else {
                if (line.startsWith("maxBiome=")) {
                    this.data.maxBiome = parseInt(line.slice(9), 10);
                }
            }
        }
        if (mode == "transitions") {
            if (line == "=====") {
                mode = "spriteInfo";
                continue;
            } else {
                var parts = line.split(" ");
                var transition = {
                    actorId: parseInt(parts[0], 10),
                    targetId: parseInt(parts[1], 10),
                    newActorId: parseInt(parts[2], 10),
                    newTargetId: parseInt(parts[3], 10),
                    timer: parseInt(parts[4], 10),
                    reverseUseActor: parseInt(parts[5], 10),
                    reverseUseTarget: parseInt(parts[6], 10),
                    requireUnusedActor: parseInt(parts[7], 10),
                    requireUnusedTarget: parseInt(parts[8], 10),
                    lastUseActor: parseInt(parts[9], 10),
                    lastUseTarget: parseInt(parts[10], 10)
                };
                this.data.transitions.push(transition);
            }
        }
        if (mode == "spriteInfo") {
            if (line == "=====") {
                mode = "objects";
            } else {
                var parts = line.split(" ");
                var info = {
                    x: parseInt(parts[1], 10),
                    y: parseInt(parts[2], 10),
                    width: parseInt(parts[3], 10),
                    height: parseInt(parts[4], 10),
                    centerX: parseInt(parts[5], 10),
                    centerY: parseInt(parts[6], 10),
                    anchorX: parseInt(parts[7], 10),
                    anchorY: parseInt(parts[8], 10)
                };

                this.data.spriteInfo[parseInt(parts[0], 10)] = info;
            }
        }
        if (mode == "objects") {
            if (line == "=====") {
                if (curObj) {
                    curObj.held = !curObj.permanent;
                    if (curObj.spriteAppearOrder && (curObj.numUses <= 1 || curObj.spriteAppearOrder.length > curObj.numUses)) {
                        curObj.spriteAppearOrder = null;
                    }
                    if (curObj.spriteHideOrder && (curObj.numUses <= 1 || curObj.spriteHideOrder.length > curObj.numUses)) {
                        curObj.spriteHideOrder = null;
                    }
                    if (curObj.numUses > 1 && !curObj.spriteAppearOrder) {
                        curObj.additive = false;
                    }
                    this.data.objects[curObj.id] = curObj;
                }
                curObj = {
                    id: -100,
                    name: "",
                    searchName: "",
                    permanent: 0,
                    containSize: 0,
                    biomes: [],
                    categories: [],
                    heat: 0,
                    rValue: 0.0,
                    food: 0,
                    speed: 0.0,
                    clothing: "n",
                    numSlots: 0,
                    numUses: 0,
                    pixHeight: 0,
                    held: 0,
                    techLevel: -1,
                    sprites: [],
                    spriteAppearOrder: null,
                    spriteHideOrder: null,
                    creationScore: 0,
                    additive: true
                };
                for (var b = 0; b <= this.data.maxBiome; ++b) {
                    curObj.biomes.push(0);
                }
            } else if (line.length > 0) {
                if (line.startsWith("id=")) {
                    curObj.id = parseInt(line.slice(3), 10);
                } else if (line.startsWith("name=")) {
                    curObj.name = line.slice(5);
                    curObj.searchName = curObj.name.toLowerCase();
                } else if (line.startsWith("permanent=")) {
                    curObj.permanent = parseInt(line.slice(10), 10);
                } else if (line.startsWith("containSize=")) {
                    curObj.containSize = parseInt(line.slice(12), 10);
                } else if (line.startsWith("biomes=")) {
                    var biomes = line.slice(7).split(",");
                    for (var b = 0; b < biomes.length; ++b) {
                        curObj.biomes[parseInt(biomes[b], 10)] = 1;
                    }
                } else if (line.startsWith("mapChance=")) {
                    curObj.creationScore = parseFloat(line.slice(10));
                } else if (line.startsWith("categories=")) {
                    var cats = line.slice(11).split(",");
                    for (var c = 0; c < cats.length; ++c) {
                        var categoryId = parseInt(cats[c], 10);
                        this.data.categories[categoryId] = (this.data.categories[categoryId] || []);
                        this.data.categories[categoryId].push(curObj.id);
                        curObj.categories.push(categoryId);
                    }
                } else if (line.startsWith("heat=")) {
                    curObj.heat = parseInt(line.slice(5), 10);
                } else if (line.startsWith("rValue=")) {
                    curObj.rValue = parseFloat(line.slice(7));
                } else if (line.startsWith("food=")) {
                    curObj.food = parseInt(line.slice(5), 10);
                } else if (line.startsWith("speed=")) {
                    curObj.speed = parseFloat(line.slice(6));
                } else if (line.startsWith("clothing=")) {
                    curObj.clothing = line.slice(9);
                } else if (line.startsWith("numSlots=")) {
                    curObj.numSlots = parseInt(line.slice(9), 10);
                } else if (line.startsWith("numUses=")) {
                    curObj.numUses = parseInt(line.slice(8), 10);
                } else if (line.startsWith("numSprites=")) {
                    // Unused
                } else if (line.startsWith("pixHeight=")) {
                    curObj.pixHeight = parseInt(line.slice(10), 10);
                } else if (line.startsWith("held=")) {
                    curObj.held = parseInt(line.slice(5), 10);
                } else if (line.startsWith("sprite=")) {
                    var parts = line.slice(7).split(",");
                    var sprite = {
                        id: parseInt(parts[0], 10),
                        x: parseFloat(parts[1]),
                        y: parseFloat(parts[2]),
                        rot: parseFloat(parts[3]),
                        hFlip: parseInt(parts[4], 10),
                        parent: parseInt(parts[5], 10),
                        r: parseFloat(parts[6]),
                        g: parseFloat(parts[7]),
                        b: parseFloat(parts[8]),
                        info: null
                    };
                    sprite.info = this.data.spriteInfo[sprite.id];
                    curObj.sprites.push(sprite);
                } else if (line.startsWith("spriteAppearOrder=")) {
                    var parts = line.slice(18).split(",");
                    curObj.spriteAppearOrder = [];
                    for (var p = 0; p < parts.length; ++p) {
                        curObj.spriteAppearOrder.push(parseInt(parts[p], 10));
                    }
                } else if (line.startsWith("spriteHideOrder=")) {
                    var parts = line.slice(16).split(",");
                    curObj.spriteHideOrder = [];
                    for (var p = 0; p < parts.length; ++p) {
                        curObj.spriteHideOrder.push(parseInt(parts[p], 10));
                    }
                } else {
                    console.error("Unknown param on line", i+1);
                }
            }
        }
    }
};

DataLoader.prototype.postprocessData = function() {
    // Expand category transitions
    var categoryIds = [];
    for (var i = 0; i < this.data.objects.length; ++i) {
        if (this.data.objects[i] && this.data.objects[i].name[0] == "@") {
            categoryIds.push(i);
        }
    }
    var newTransitions = [];
    for (var i = 0; i < this.data.transitions.length; ++i) {
        var t = this.data.transitions[i];
        if (categoryIds.includes(t.actorId)) {
            var actors = this.data.categories[t.actorId];
            for (var actorIdx = 0; actorIdx < actors.length; ++actorIdx) {
                var newT = Object.assign({}, t, { actorId: actors[actorIdx] });
                if (t.actorId == t.newActorId) {
                    newT.newActorId = newT.actorId;
                }
                newTransitions.push(newT);
            }
        } else {
            newTransitions.push(t);
        }
    }
    this.data.transitions = newTransitions;
    newTransitions = [];
    for (var i = 0; i < this.data.transitions.length; ++i) {
        var t = this.data.transitions[i];
        if (categoryIds.includes(t.targetId)) {
            var targets = this.data.categories[t.targetId];
            for (var targetIdx = 0; targetIdx < targets.length; ++targetIdx) {
                var newT = Object.assign({}, t, { targetId: targets[targetIdx] });
                if (t.targetId == t.newTargetId) {
                    newT.newTargetId = newT.targetId;
                }
                newTransitions.push(newT);
            }
        } else {
            newTransitions.push(t);
        }
    }
    this.data.transitions = newTransitions;

    // Gather creation transitions
    for (var i = 0; i < this.data.transitions.length; ++i) {
        var t = this.data.transitions[i];
        if (!([-2, -1, 0, t.actorId].includes(t.newActorId))) {
            this.data.creationTransitions[t.newActorId] = (this.data.creationTransitions[t.newActorId] || []);
            this.data.creationTransitions[t.newActorId].push({
                type: "actor",
                transition: t
            });
        }
        if (!([-2, -1, 0, t.targetId].includes(t.newTargetId))) {
            this.data.creationTransitions[t.newTargetId] = (this.data.creationTransitions[t.newTargetId] || []);
            this.data.creationTransitions[t.newTargetId].push({
                type: "target",
                transition: t
            });
        }
    }

    // Gather usage transitions
    for (var i = 0; i < this.data.transitions.length; ++i) {
        var t = this.data.transitions[i];
        if (t.actorId == t.newActorId && ![-2, -1, 0].includes(t.actorId) && this.data.objects[t.actorId].numUses > 1) {
            this.data.usageTransitions[t.actorId] = (this.data.usageTransitions[t.actorId] || []);
            this.data.usageTransitions[t.actorId].push({
                type: "actor",
                transition: t
            });
        }
        if (t.targetId == t.newTargetId && ![-2, -1, 0].includes(t.targetId) && this.data.objects[t.targetId].numUses > 1) {
            this.data.usageTransitions[t.targetId] = (this.data.usageTransitions[t.targetId] || []);
            this.data.usageTransitions[t.targetId].push({
                type: "target",
                transition: t
            });
        }
    }

    // Initialize tech tree
    this.data.techTree[-1] = [];
    this.data.techTree[0] = [];
    var sortedIds = [-2, -1, 0];
    var remaining = [];

    for (var id = 0; id < this.data.objects.length; ++id) {
        if (this.data.objects[id]) {
            if (this.data.objects[id].biomes.includes(1)) {
                this.data.techTree[0].push(id);
                this.data.objects[id].techLevel = 0;
                sortedIds.push(id);
            } else if (!this.data.creationTransitions[id]) {
                if (this.data.objects[id].name[0] != "@") {
                    this.data.techTree[-1].push(id);
                    sortedIds.push(id);
                }
            } else if (!sortedIds.includes(id)) {
                remaining.push(id);
            }
        }
    }

    // TODO: Maybe transitions that only take time should be collapsed into the same tech level?
    // Should waiting for a rabbit to come out really count as an additinal tech level??

    // Build tech tree
    var techLevel = 1;
    while (remaining.length > 0) {
        this.data.techTree[techLevel] = [];
        var rest = [];
        var newSortedIds = [];
        for (var i = 0; i < remaining.length; ++i) {
            var id = remaining[i];
            var found = false;
            var ct = this.data.creationTransitions[id];
            if (ct) {
                for (var t = 0; !found && t < ct.length; ++t) {
                    if (sortedIds.includes(ct[t].transition.actorId) && sortedIds.includes(ct[t].transition.targetId)) {
                        this.data.techTree[techLevel].push(id);
                        this.data.objects[id].techLevel = techLevel;
                        newSortedIds.push(id);
                        if (this.data.objects[id].categories && this.data.objects[id].categories.length > 0) {
                            for (var cat = 0; cat < this.data.objects[id].categories.length; ++cat) {
                                var catId = this.data.objects[id].categories[cat];
                                if (this.data.objects[catId].techLevel == -1) {
                                    this.data.objects[catId].techLevel = techLevel;
                                }
                                newSortedIds.push(catId);
                            }
                        }
                        found = true;
                    }
                }

                if (!found) {
                    rest.push(id);
                }
            }
        }
        for (var i = 0; i < newSortedIds.length; ++i) {
            if (!sortedIds.includes(newSortedIds[i])) {
                sortedIds.push(newSortedIds[i]);
            }
        }
        techLevel++;
        var prevRemaining = remaining.length;
        var currentRemaining = rest.length;
        if (prevRemaining == currentRemaining) {
            console.error("We're stuck");
            debugger;
        }
        remaining = rest;
    }

    // Inherit biomes
    var modified = true;
    while (modified) {
        modified = false;
        for (var id = 0; id < this.data.objects.length; ++id) {
            if (this.data.objects[id] && !this.data.objects[id].held && !this.data.objects[id].biomes.includes(1)) {
                var ct = this.data.creationTransitions[id];
                if (ct) {
                    for (var t = 0; t < ct.length; ++t) {
                        var objType = ct[t].type;
                        var candidateId;
                        if (objType == "actor") {
                            candidateId = ct[t].transition.actorId;
                        } else {
                            candidateId = ct[t].transition.targetId;
                        }
                        var candidate = this.data.objects[candidateId];
                        if (candidate && !candidate.held && candidate.biomes.includes(1)) {
                            for (var b = 0; b <= this.data.maxBiome; ++b) {
                                this.data.objects[id].biomes[b] |= candidate.biomes[b];
                            }
                            modified = true;
                        }
                    }
                }
            }
        }
    }
};

DataLoader.prototype.triggerLoaded = function() {
    for (var i = 0; i < this.callbacks.length; ++i) {
        this.callbacks[i](this.data);
    }

    this.callbacks = [];
};

function Page() {
    this.techTreeViewContainer = document.querySelector(".tech_tree_view");
    this.recipeViewContainer = document.querySelector(".recipe_view");
    this.backButton = document.querySelector(".header .back");
    this.data = null;

    this.techTreeView = new TechTreeView(this.techTreeViewContainer, this.onQueryChanged.bind(this), this.onObjectSelected.bind(this));
    this.recipeView = new RecipeView(this.recipeViewContainer, this.onRecipeStateChanged.bind(this));

    this.backButton.addEventListener("click", function() {
        if (history.state) {
            history.back();
        } else {
            history.pushState(null, null, "#");
            this.navigateToHash();
        }
    }.bind(this));

    this.navigateToHash();

    window.addEventListener("popstate", this.onPopState.bind(this));
}

Page.prototype.setData = function(data) {
    this.data = data;
    this.techTreeView.setData(data);
    this.recipeView.setData(data);
};

Page.prototype.onQueryChanged = function(query) {
    history.replaceState(history.state, null, "#q=" + encodeURIComponent(query));
};

Page.prototype.onObjectSelected = function(id) {
    history.replaceState({ desiredScrollPos: window.scrollY }, null, null);
    var state = this.recipeView.startRecipe(id);
    this.showRecipe();
    history.pushState({ back: true }, null, "#r=" + state);
};

Page.prototype.onRecipeStateChanged = function(state) {
    history.replaceState(history.state, null, "#r=" + encodeURIComponent(state));
};

Page.prototype.showTechTree = function() {
    this.techTreeViewContainer.style.display = "block";
    this.recipeViewContainer.style.display = "none";
    this.backButton.style.display = "none";
    this.techTreeView.focus();
};

Page.prototype.showRecipe = function() {
    this.techTreeViewContainer.style.display = "none";
    this.recipeViewContainer.style.display = "block";
    this.backButton.style.display = "block";
};

Page.prototype.navigateToHash = function() {
    var hash = location.hash;
    var found = false;
    if (hash && hash.length > 0) {
        if (hash[0] == "#") {
            hash = hash.slice(1);
        }
        if (hash.startsWith("q=")) {
            this.showTechTree();
            this.techTreeView.setQuery(decodeURIComponent(hash.slice(2)));
            found = true;
        } else if (hash.startsWith("r=")){
            this.showRecipe();
            this.recipeView.setState(decodeURIComponent(hash.slice(2)));
            found = true;
        }
    }
    if (!found) {
        this.techTreeView.reset();
        this.showTechTree();
    }
};

Page.prototype.onPopState = function(ev) {
    var desiredScrollPos = ev.state ? ev.state.desiredScrollPos : null;
    this.navigateToHash();
    if (desiredScrollPos) {
        setTimeout(function() {
            window.scrollTo(0, desiredScrollPos);
        }, 0);
    }
};

function TechTreeView(container, onQueryChanged, onSelected) {
    this.container = container;
    this.onQueryChanged = onQueryChanged;
    this.onSelected = onSelected;
    this.data = null;
    this.renderData = null;

    this.query = "";
    this.category = "all";

    this.searchEl = container.querySelector("#search");
    this.techTreeEl = container.querySelector(".tech_tree");
    this.categoriesContainerEl = container.querySelector(".categories");

    this.levelElPrototype = document.createElement("DIV");
    this.levelElPrototype.classList.add("level_container");

    var levelLabelPrototype = document.createElement("DIV");
    levelLabelPrototype.classList.add("level");
    var levelLabelSpanPrototype = document.createElement("SPAN");
    levelLabelSpanPrototype.textContent = "LEVEL";
    levelLabelPrototype.appendChild(levelLabelSpanPrototype);
    var levelLabelNumPrototype = document.createElement("DIV");
    levelLabelNumPrototype.classList.add("num");
    levelLabelPrototype.appendChild(levelLabelNumPrototype);
    this.levelElPrototype.appendChild(levelLabelPrototype);

    var levelObjectsContainerPrototype = document.createElement("DIV");
    levelObjectsContainerPrototype.classList.add("objects");
    this.levelElPrototype.appendChild(levelObjectsContainerPrototype);

    var levelPaddingPrototype = document.createElement("DIV");
    levelPaddingPrototype.classList.add("padding");
    this.levelElPrototype.appendChild(levelPaddingPrototype);

    this.searchEl.addEventListener("input", this.onSearchInput.bind(this));
    this.categoriesContainerEl.addEventListener("click", this.onCategorySelected.bind(this));
}

TechTreeView.prototype.reset = function() {
    this.category = "all";
    this.updateCategoryUI();
    this.query = "";
    this.searchEl.value = "";
    this.triggerQueryChanged();
};

TechTreeView.prototype.focus = function() {
    this.searchEl.focus();
    this.searchEl.select();
};

TechTreeView.prototype.setQuery = function(query) {
    this.category = query.slice(0, query.indexOf("!"));
    this.query = query.slice(query.indexOf("!") + 1);
    this.searchEl.value = this.query;
    this.searchEl.focus();
    this.searchEl.select();
    this.updateCategoryUI();
    this.runSearch();
};

TechTreeView.prototype.getQuery = function() {
    return this.category + "!" + this.query;
};

TechTreeView.prototype.setCategory = function(cat) {
    this.category = cat;
    this.updateCategoryUI();
    this.triggerQueryChanged();
    this.runSearch();
};

TechTreeView.prototype.setData = function(data) {
    this.data = data;
    this.runSearch();
};

TechTreeView.prototype.onSearchInput = function(ev) {
    this.query = this.searchEl.value.trim().toLowerCase();
    this.triggerQueryChanged();
    this.runSearch();
};

TechTreeView.prototype.onCategorySelected = function(ev) {
    var el = ev.target;
    var found = false;
    while (el && el != document.body) {
        if (el.parentElement == this.categoriesContainerEl) {
            found = true;
            break;
        } else {
            el = el.parentElement;
        }
    }

    if (found) {
        this.setCategory(el.classList.item(0));
    }
};

TechTreeView.prototype.onTechTreeClick = function(ev) {
    var el = ev.target;
    var found = false;
    while (el && el != document.body) {
        if (el.getAttribute("data-obj-id")) {
            found = true;
            break;
        } else {
            el = el.parentElement;
        }
    }

    if (found) {
        this.triggerSelected(parseInt(el.getAttribute("data-obj-id"), 10));
    }
};

TechTreeView.prototype.triggerQueryChanged = function() {
    if (this.onQueryChanged) {
        this.onQueryChanged(this.getQuery());
    }
};

TechTreeView.prototype.triggerSelected = function(id) {
    if (this.onSelected) {
        this.onSelected(id);
    }
};

TechTreeView.prototype.updateCategoryUI = function() {
    var catEls = this.categoriesContainerEl.children;
    for (var i = 0; i < catEls.length; ++i) {
        if (catEls[i].classList.contains(this.category)) {
            catEls[i].classList.add("active");
        } else {
            catEls[i].classList.remove("active");
        }
    }
};

TechTreeView.prototype.runSearch = function() {
    if (this.data) {
        var techTreeToRender = [];
        for (var i = -1; i < this.data.techTree.length; ++i) {
            var results = [];
            for (var j = 0; j < this.data.techTree[i].length; ++j) {
                var obj = this.data.objects[this.data.techTree[i][j]];
                var pass = false;
                if (this.query.length == 0 || obj.searchName.includes(this.query)) {
                    if (this.category == "all") {
                        pass = true;
                    } else if (this.category == "food") {
                        pass = obj.food > 0;
                    } else if (this.category == "heat_source") {
                        pass = obj.heat > 0;
                    } else if (this.category == "clothing") {
                        pass = (obj.clothing != "n" && obj.rValue > 0);
                    } else if (this.category == "containers") {
                        pass = obj.numSlots > 0;
                    }
                }
                if (pass) {
                    results.push(obj.id);
                }
            }
            if (results.length > 0) {
                techTreeToRender.push([i, results]);
            }
        }

        var diff = !this.renderData;
        if (!diff) {
            if (this.renderData.toRender.length == techTreeToRender.length) {
                for (var i = 0; !diff && i < techTreeToRender.length; ++i) {
                    diff = (this.renderData.toRender[i][1].length != techTreeToRender[i][1].length);
                }
            } else {
                diff = true;
            }
        }


        if (diff) {
            var newTechTreeEl = this.techTreeEl.cloneNode(false);
            this.techTreeEl.parentElement.insertBefore(newTechTreeEl, this.techTreeEl);
            this.techTreeEl.parentElement.removeChild(this.techTreeEl);
            this.techTreeEl = newTechTreeEl;
            this.techTreeEl.addEventListener("click", this.onTechTreeClick.bind(this));

            if (this.renderData && this.renderData.rafHandle) {
                cancelAnimationFrame(this.renderData.rafHandle);
                this.renderData.rafHandle = null;
            }
            this.renderData = {
                toRender: techTreeToRender,
                levelIdx: 0,
                objIdx: 0,
                curLevelEl: null,
                rafHandle: null
            };
            this.render();
        }
    }
};

TechTreeView.prototype.render = function() {
    var startTime = performance.now();
    var done = false;
    while (!done && (performance.now() - startTime) < 1) {
        done = this.renderStep();
    }
    if (!done) {
        this.renderData.rafHandle = requestAnimationFrame(this.render.bind(this));
    } else {
        this.renderData.rafHandle = null;
    }
};

TechTreeView.prototype.renderStep = function() {
    if (this.renderData.levelIdx < this.renderData.toRender.length) {
        if (this.renderData.curLevelEl) {
            var objIds = this.renderData.toRender[this.renderData.levelIdx][1];
            while (this.renderData.objIdx < objIds.length) {
                var objId = objIds[this.renderData.objIdx++];
                this.renderData.curLevelEl.appendChild(createObjectElement(this.data.objects[objId], 150, 150, true));
                if (this.renderData.objIdx == objIds.length) {
                    this.renderData.levelIdx++;
                    this.renderData.objIdx = 0;
                    this.renderData.curLevelEl = null;
                    return this.renderData.levelIdx == this.renderData.toRender.length;
                }
            }
        } else {
            var levelEl = this.levelElPrototype.cloneNode(true);
            var levelNum = this.renderData.toRender[this.renderData.levelIdx][0];
            levelEl.querySelector(".num").textContent = levelNum
            if (levelNum == -1) {
                levelEl.querySelector(".padding").textContent = "These objects cannot be made and they do not spawn on the map.";
            } else if (levelNum == 0) {
                levelEl.querySelector(".padding").textContent = "These objects cannot be made, but they spawn on the map. All other objects are made from these.";
            }
            this.renderData.curLevelEl = levelEl.querySelector(".objects");
            this.techTreeEl.appendChild(levelEl);
            return false;
        }
    } else {
        return true;
    }
};

function RecipeView(container, onStateChanged) {
    this.container = container;
    this.targetObjectContainer = container.querySelector(".target_object .object_container");
    this.ingredientsEl = container.querySelector(".ingredients");
    this.stepsEl = container.querySelector(".steps");
    this.treeEl = container.querySelector(".tree");
    this.overEl = container.querySelector(".over");
    this.onStateChanged = onStateChanged;
    this.recipeTree = null;
    this.currentNode = null;
    this.data = null;

    document.body.addEventListener("click", function() {
        if (this.treeEl) {
            this.treeEl.style.display = "none";
            this.currentNode = null;
        }
    }.bind(this));
};

RecipeView.prototype.getTextForStep = function(step) {
    var actor = step.transitions[step.selected][0];
    var target = step.transitions[step.selected][1];
    var text = {
        preActor: "Use ",
        preTarget: " with ",
        preResult: " to create "
    };

    if (actor.id == -2) {
        text.preActor = "";
        text.preTarget = " ";
    } else if (actor.id == -1) {
        text.preActor = "Wait ";
        text.preTarget = " until ";
        text.preResult = " becomes ";
    } else if (actor.id == 0) {
        text.preActor = "Use your ";
        text.preTarget = " on ";
    } else if (target.id == 0) {
        text.preTarget = " on ";
    }

    return text;
};

RecipeView.prototype.getNodeName = function(node) {
    var id = node.id;
    var type = node.type;
    var name = "";
    if (id > 0 && this.data && this.data.objects[id]) {
        name = getObjectName(this.data.objects[id], node.numUsed);
        if (name.startsWith("@")) {
            name = name.replace("@", "Any");
        }
    } else if (id == -2 && type == "actor") {
        name = "Touch";
    } else if (id == -2 && type == "target") {
        name = "Nothing";
    } else if (id == -1 && type == "actor") {
        name = prettyTimeString(node.timer);
    } else if (id == -1 && type == "target") {
        name = "Remove";
    } else if (id == 0 && type == "actor") {
        name = "Hand";
    } else if (id == 0 && type == "target") {
        name = "Person";
    } else {
        name = "Unknown";
    }

    return name;
};

RecipeView.prototype.startRecipe = function(id) {
    this.recipeTree = this.makeNode(id);
    if (this.data) {
        this.targetObjectContainer.innerHTML = "";
        this.targetObjectContainer.appendChild(createObjectElement(this.data.objects[id], 200, 200, true, "long"));
        this.populateTransitions(this.recipeTree);
        this.updateRecipeUI();
    }

    return this.getState();
};

RecipeView.prototype.setData = function(data) {
    this.data = data;
    if (this.pendingState) {
        this.setState(this.pendingState);
    }
};

RecipeView.prototype.setState = function(state) {
    var applyState = (function(parts, node) {
        var selection = parts.shift();
        if (selection != "_") {
            selection = selection.split("_");
            if (node) {
                this.populateTransitions(node);
                for (var i = 0; i < node.transitions.length; ++i) {
                    var t = node.transitions[i];
                    if (t[0].id == parseInt(selection[0], 10) && t[1].id == parseInt(selection[1], 10)) {
                        node.selected = i;
                        break;
                    }
                }
            }
            if (node && node.selected != -1) {
                applyState(parts, node.transitions[node.selected][0]);
                applyState(parts, node.transitions[node.selected][1]);
            } else {
                applyState(parts, null);
                applyState(parts, null);
            }
        }
    }).bind(this);
    if (this.data) {
        var parts = state.split('!');
        var root = parts.shift();
        this.startRecipe(parseInt(root, 10));
        applyState(parts, this.recipeTree);
        this.updateRecipeUI();
        this.pendingState = null;
    } else {
        this.pendingState = state;
    }
};

RecipeView.prototype.getState = function() {
    var state = [];
    function buildState(state, node) {
        if (node.selected != -1) {
            var t = node.transitions[node.selected];
            state.push(t[0].id + "_" + t[1].id);
            buildState(state, t[0]);
            buildState(state, t[1]);
        } else {
            state.push('_');
        }
    }
    if (this.recipeTree) {
        state.push(this.recipeTree.id);
        buildState(state, this.recipeTree);
    }
    return state.join("!");
};

RecipeView.prototype.triggerStateChanged = function() {
    if (this.onStateChanged) {
        var state = this.getState();
        this.onStateChanged(state);
    }
};

RecipeView.prototype.makeNode = function(id, type, numUsed, timer, transitions, selected) {
    return {
        id: id,
        numUsed: numUsed || 0,
        timer: timer || 0,
        type: type,
        transitions: (transitions || []),
        selected: (selected === undefined ? -1 : selected)
    };
};

RecipeView.prototype.getTransitionsForObject = function(id, numUsed) {
    var allTransitions = [];
    var creationMode = "none";
    var usageMode = "none";
    if (this.data.objects[id].numUses <= 1) {
        creationMode = "all";
        usageMode = "none";
    } else if (numUsed == 0) {
        creationMode = "no_reverse";
        usageMode = "reverse";
    } else if (numUsed == this.data.objects[id].numUses - 1) {
        creationMode = "reverse";
        usageMode = "no_reverse"; // We assume that the last use will always transition to a different object.
    } else if (numUsed > 0 && numUsed < this.data.objects[id].numUses - 1) {
        creationMode = "none";
        usageMode = "all";
    }
    if (creationMode != "none") {
        var ct = this.data.creationTransitions[id];
        if (ct) {
            if (creationMode == "all") {
                allTransitions = allTransitions.concat(ct);
            } else {
                var desiredReverse = creationMode == "reverse";
                for (var i = 0; i < ct.length; ++i) {
                    var reverse = false;
                    if (ct[i].type == "actor") {
                        reverse = ct[i].transition.reverseUseActor;
                    } else {
                        reverse = ct[i].transition.reverseUseTarget;
                    }
                    if (reverse == desiredReverse) {
                        allTransitions.push(ct[i]);
                    }
                }
            }
        }
    }
    if (usageMode != "none") {
        var ut = this.data.usageTransitions[id];
        if (ut) {
            if (usageMode == "all") {
                allTransitions = allTransitions.concat(ut);
            } else {
                var desiredReverse = usageMode == "reverse";
                for (var i = 0; i < ut.length; ++i) {
                    var reverse = false;
                    if (ut[i].type == "actor") {
                        reverse = ut[i].transition.reverseUseActor;
                    } else {
                        reverse = ut[i].transition.reverseUseTarget;
                    }
                    if (reverse == desiredReverse) {
                        allTransitions.push(ut[i]);
                    }
                }
            }
        }
    }
    return allTransitions;
};

RecipeView.prototype.populateTransitions = function(node) {
    if (node.transitions.length == 0) {
        if (this.data.objects[node.id]) {
            var allTransitions = this.getTransitionsForObject(node.id, node.numUsed);
            if (this.data.objects[node.id].name[0] == "@") {
                for (var id = 0; id < this.data.objects.length; ++id) {
                    if (this.data.objects[id] && this.data.objects[id].categories.includes(node.id)) {
                        allTransitions = allTransitions.concat(this.getTransitionsForObject(id, node.numUsed));
                        // TODO: This is wrong. It merges transitions from different objects in a weird way.
                        // Need to select a specific object to do this right.
                    }
                }
            }

            for (var i = 0; i < allTransitions.length; ++i) {
                var t = allTransitions[i];
                var actorUsed = 0;
                if (![-2, -1, 0].includes(t.transition.actorId) && this.data.objects[t.transition.actorId].numUses > 1) {
                    if (t.type == "actor" && t.transition.actorId == node.id) {
                        actorUsed = node.numUsed + (t.transition.reverseUseActor ? 1 : -1);
                    } else if (t.transition.lastUseActor) {
                        if (!t.transition.reverseUseActor) {
                            actorUsed = this.data.objects[t.transition.actorId].numUses - 1;
                        }
                    }
                }
                var targetUsed = 0;
                if (![-2, -1, 0].includes(t.transition.targetId) && this.data.objects[t.transition.targetId].numUses > 1) {
                    if (t.type == "target" && t.transition.targetId == node.id) {
                        targetUsed = node.numUsed + (t.transition.reverseUseTarget ? 1 : -1);
                    } else if (t.transition.lastUseTarget) {
                        if (!t.transition.reverseUseTarget) {
                            targetUsed = this.data.objects[t.transition.targetId].numUses - 1;
                        }

                    }
                }
                var actorNode = this.makeNode(t.transition.actorId, "actor", actorUsed, (t.transition.actorId == -1 ? t.transition.timer : 0));
                var targetNode = this.makeNode(t.transition.targetId, "target", targetUsed);

                node.transitions.push([
                    actorNode,
                    targetNode
                ]);
            }
        }
        if (node.transitions.length > 0) {
            node.transitions.sort(function(a, b) {
                var maxA = Math.max((a[0].id > 0 ? this.data.objects[a[0].id].techLevel : -1), (a[1].id > 0 ? this.data.objects[a[1].id].techLevel : -1));
                var maxB = Math.max((b[0].id > 0 ? this.data.objects[b[0].id].techLevel : -1), (b[1].id > 0 ? this.data.objects[b[1].id].techLevel : -1));
                return maxA - maxB;
            }.bind(this));
        }
    }
};

RecipeView.prototype.modifyNode = function(el, node, ev) {
    if (ev) {
        ev.stopPropagation();
    }
    if (this.currentNode == node) {
        this.treeEl.style.display = "none";
        this.currentNode = null;
    } else {
        this.populateTransitions(node);
        this.currentNode = node;

        var newTreeEl = this.treeEl.cloneNode(false);
        this.treeEl.parentElement.insertBefore(newTreeEl, this.treeEl);
        this.treeEl.parentElement.removeChild(this.treeEl);
        this.treeEl = newTreeEl;

        this.treeEl.addEventListener("click", function(ev) {
            ev.stopPropagation();
        });

        var headerEl = document.createElement("DIV");
        headerEl.classList.add("tree_header");

        headerEl.appendChild(createObjectElement(this.data.objects[node.id], 120, 120, false, "none", node.numUsed));
        this.treeEl.appendChild(headerEl);

        var gotIt = document.createElement("DIV");
        gotIt.textContent = "Already got it!";
        gotIt.classList.add("transition");
        gotIt.classList.add("got_it");
        if (node.selected == -1) {
            gotIt.classList.add("selected");
        }
        gotIt.addEventListener("click", this.selectNodeChild.bind(this, -1));
        this.treeEl.appendChild(gotIt);

        for (var i = 0; i < node.transitions.length; ++i) {
            var t = node.transitions[i];
            var transitionEl = document.createElement("DIV");
            transitionEl.classList.add("transition");
            if (node.selected == i) {
                transitionEl.classList.add("selected");
            }
            transitionEl.appendChild(createObjectElementById(this.data.objects, t[0].id, "actor", t[0].timer, t[0].numUsed, 120, 120));
            transitionEl.appendChild(document.createTextNode("+"));
            transitionEl.appendChild(createObjectElementById(this.data.objects, t[1].id, "target", null, t[1].numUsed, 120, 120));
            transitionEl.addEventListener("click", this.selectNodeChild.bind(this, i));
            this.treeEl.appendChild(transitionEl);
        }

        var centerX = el.offsetParent.offsetLeft + el.offsetLeft + el.offsetWidth/2;
        var bottomY = el.offsetParent.offsetTop + el.offsetTop + el.offsetHeight;
        this.treeEl.style.top = Math.floor(bottomY) + 13 + "px";
        this.treeEl.style.display = "block";
        this.treeEl.style.left = Math.floor(centerX - this.treeEl.offsetWidth/2) + "px";
    }
};

RecipeView.prototype.selectNodeChild = function(idx, el) {
    this.currentNode.selected = idx;
    var transitionEls = this.treeEl.querySelectorAll(".transition");
    for (var i = 0; i < transitionEls.length; ++i) {
        if (i-1 == idx) {
            transitionEls[i].classList.add("selected");
        } else {
            transitionEls[i].classList.remove("selected");
        }
    }

    this.treeEl.style.display = "none";
    var modified = this.currentNode;
    this.currentNode = null;
    this.updateRecipeUI(modified);
    this.triggerStateChanged();

    el.stopPropagation();
    return false;
};

RecipeView.prototype.updateRecipeUI = function(modifiedNode) {
    this.treeEl.style.display = "none";
    var ingredients = [];
    var steps = [];
    this.processNode(ingredients, steps, this.recipeTree);

    ingredients.sort(function(a, b) {
        var compare = this.data.objects[a.id].techLevel - this.data.objects[b.id].techLevel;
        if (compare == 0) {
            compare = this.data.objects[a.id].name.localeCompare(this.data.objects[b.id].name);
        }
        return compare;
    }.bind(this));

    var groupedIngredients = [];
    var prevIngredient = ingredients[0];
    var count = 1;
    for (var i = 1; i < ingredients.length; ++i) {
        var ingredient = ingredients[i];
        if (ingredient.id != prevIngredient.id) {
            groupedIngredients.push([count, prevIngredient]);
            prevIngredient = ingredient;
            count = 1;
        } else {
            count++;
        }
    }
    groupedIngredients.push([count, prevIngredient]);

    var newIngredientsEl = this.ingredientsEl.cloneNode(false);
    this.ingredientsEl.parentElement.insertBefore(newIngredientsEl, this.ingredientsEl);
    this.ingredientsEl.parentElement.removeChild(this.ingredientsEl);
    this.ingredientsEl = newIngredientsEl;

    var newStepsEl = this.stepsEl.cloneNode(false);
    this.stepsEl.parentElement.insertBefore(newStepsEl, this.stepsEl);
    this.stepsEl.parentElement.removeChild(this.stepsEl);
    this.stepsEl = newStepsEl;
    for (var i = 0; i < groupedIngredients.length; ++i) {
        var node = groupedIngredients[i][1];
        var ingredientEl = document.createElement("LI");
        ingredientEl.classList.add("ingredient");
        ingredientEl.textContent = groupedIngredients[i][0] + "x " + this.getNodeName(node);
        this.ingredientsEl.appendChild(ingredientEl);
    }

    if (steps.length == 0) {
        var stepEl = document.createElement("LI");
        stepEl.classList.add("step");
        stepEl.appendChild(document.createTextNode("Click to edit recipe: "));
        var resultEl = document.createElement("A");
        resultEl.setAttribute("href", "javascript:;");
        resultEl.classList.add("step_ingredient");
        if (this.recipeTree == this.currentNode) {
            resultEl.classList.add("current");
        }
        resultEl.classList.add("result");
        resultEl.classList.add("final");
        resultEl.textContent = this.getNodeName(this.recipeTree);
        resultEl.addEventListener("click", this.modifyNode.bind(this, resultEl, this.recipeTree));
        stepEl.appendChild(resultEl);
        this.stepsEl.appendChild(stepEl);
    } else {
        for (var i = 0; i < steps.length; ++i) {
            var node = steps[i].node;
            var indent = steps[i].indent;
            var stepText = this.getTextForStep(node);
            var children = node.transitions[node.selected];
            var stepEl = document.createElement("LI");
            stepEl.classList.add("step");
            if (node == modifiedNode) {
                stepEl.classList.add("modified");
                setTimeout(function(el) {
                    el.classList.remove("modified");
                }.bind(this, stepEl), 0);
            }
            var indentEl = document.createElement("DIV");
            indentEl.classList.add("indent");
            if (steps[i].side) {
                indentEl.classList.add(steps[i].side);
            }
            if (steps[i].parent) {
                indentEl.classList.add("has_parent");
            }
            indentEl.style.left = -28 + -(indent * 10) + "px";
            indentEl.style.width = (indent * 10) + "px";
            stepEl.appendChild(indentEl);
            stepEl.appendChild(document.createTextNode(stepText.preActor));
            var actorEl = document.createElement("A");
            actorEl.setAttribute("href", "javascript:;");
            actorEl.classList.add("step_ingredient");
            if (children[0] == this.currentNode) {
                actorEl.classList.add("current");
            }
            actorEl.classList.add("actor");
            if (children[0].id > 0 && children[0].selected == -1) {
                actorEl.classList.add("ingredient");
            }
            actorEl.textContent = this.getNodeName(children[0]);
            if (children[0].id > 0) {
                actorEl.addEventListener("click", this.modifyNode.bind(this, actorEl, children[0]));
            } else {
                actorEl.classList.add("unclickable");
            }
            stepEl.appendChild(actorEl);
            stepEl.appendChild(document.createTextNode(stepText.preTarget));
            var targetEl = document.createElement("A");
            targetEl.setAttribute("href", "javascript:;");
            targetEl.classList.add("step_ingredient");
            if (children[1] == this.currentNode) {
                targetEl.classList.add("current");
            }
            targetEl.classList.add("target");
            if (children[1].id > 0 && children[1].selected == -1) {
                targetEl.classList.add("ingredient");
            }
            targetEl.textContent = this.getNodeName(children[1]);
            if (children[1].id > 0) {
                targetEl.addEventListener("click", this.modifyNode.bind(this, targetEl, children[1]));
            } else {
                targetEl.classList.add("unclickable");
            }
            stepEl.appendChild(targetEl);
            stepEl.appendChild(document.createTextNode(stepText.preResult));
            var resultEl = document.createElement("A");
            resultEl.setAttribute("href", "javascript:;");
            resultEl.classList.add("step_ingredient");
            if (node == this.currentNode) {
                resultEl.classList.add("current");
            }
            resultEl.classList.add("result");
            if (node == this.recipeTree) {
                resultEl.classList.add("final");
            }
            resultEl.textContent = this.getNodeName(node);
            resultEl.addEventListener("click", this.modifyNode.bind(this, resultEl, node));
            stepEl.appendChild(resultEl);
            steps[i].el = stepEl;
            this.stepsEl.appendChild(stepEl);
        }
        for (var i = 0; i < steps.length; ++i) {
            if (steps[i].parent) {
                var step = steps[i];
                var indentEl = step.el.querySelector(".indent");
                var distanceToParent = step.parent.el.offsetTop - step.el.offsetTop;
                indentEl.style.height = distanceToParent + "px";
            }

        }
    }
};

RecipeView.prototype.processNode = function(ingredients, steps, node, parent, side) {
    if (node.selected == -1) {
        if (node.id > 0) {
            ingredients.push(node);
        }
        return null;
    } else {
        var step = {
            node: node,
            parent: parent,
            side: side,
            indent: 0,
            el: null
        };
        var children = node.transitions[node.selected];
        var leftStep = this.processNode(ingredients, steps, children[0], step, "left");
        var rightStep = this.processNode(ingredients, steps, children[1], step, "right");

        if (leftStep && rightStep) {
            leftStep.indent = Math.max(leftStep.indent, rightStep.indent + 1);
        }

        var leftIndent = (leftStep ? leftStep.indent : 0);
        var rightIndent = (rightStep ? rightStep.indent : 0);

        step.indent = Math.max(leftIndent, rightIndent);

        if (step.parent) {
            step.indent += 1;
        }
        steps.push(step);
        return step;
    }
};

var objectPrototype = document.createElement("DIV");
objectPrototype.classList.add("object");

var biomesContainer = document.createElement("DIV");
biomesContainer.classList.add("biomes");
var biome0 = document.createElement("DIV");
biome0.classList.add("biome0");
biomesContainer.appendChild(biome0);
var biome1 = document.createElement("DIV");
biome1.classList.add("biome1");
biomesContainer.appendChild(biome1);
var biome2 = document.createElement("DIV");
biome2.classList.add("biome2");
biomesContainer.appendChild(biome2);
var biome3 = document.createElement("DIV");
biome3.classList.add("biome3");
biomesContainer.appendChild(biome3);
var biome4 = document.createElement("DIV");
biome4.classList.add("biome4");
biomesContainer.appendChild(biome4);
var biome5 = document.createElement("DIV");
biome5.classList.add("biome5");
biomesContainer.appendChild(biome5);
objectPrototype.appendChild(biomesContainer);

var spriteContainer = document.createElement("DIV");
spriteContainer.classList.add("sprite_container");
objectPrototype.appendChild(spriteContainer);

var infoContainer = document.createElement("DIV");
infoContainer.classList.add("info");
objectPrototype.appendChild(infoContainer);

var nameEl = document.createElement("SPAN");
nameEl.classList.add("name");
objectPrototype.appendChild(nameEl);


function createObjectElementById(objects, id, type, time, numUsed, width, height) {
    var result = null;
    if (id > 0 && objects[id]) {
        result = createObjectElement(objects[id], width, height, false, null, numUsed);
    } else if (id == -2 && type == "actor") {
        result = objectPrototype.cloneNode(true);
        result.querySelector(".name").textContent = "Bother";
        result.querySelector(".sprite_container").style.width = width + "px";
        result.querySelector(".sprite_container").style.height = (height-30) + "px";
    } else if (id == -2 && type == "target") {
        result = objectPrototype.cloneNode(true);
        result.querySelector(".name").textContent = "Nothing";
        result.querySelector(".sprite_container").style.width = width + "px";
        result.querySelector(".sprite_container").style.height = (height-30) + "px";
    } else if (id == -1 && type == "actor") {
        result = objectPrototype.cloneNode(true);
        var timeString = prettyTimeString(time);
        result.querySelector(".name").textContent = timeString;
        result.querySelector(".sprite_container").style.width = width + "px";
        result.querySelector(".sprite_container").style.height = (height-30) + "px";
    } else if (id == -1 && type == "target") {
        result = objectPrototype.cloneNode(true);
        result.querySelector(".name").textContent = "Remove";
        result.querySelector(".sprite_container").style.width = width + "px";
        result.querySelector(".sprite_container").style.height = (height-30) + "px";
    } else if (id == 0 && type == "actor") {
        result = objectPrototype.cloneNode(true);
        result.querySelector(".name").textContent = "Pick up";
        result.querySelector(".sprite_container").style.width = width + "px";
        result.querySelector(".sprite_container").style.height = (height-30) + "px";
    } else if (id == 0 && type == "target") {
        result = objectPrototype.cloneNode(true);
        result.querySelector(".name").textContent = "Person";
        result.querySelector(".sprite_container").style.width = width + "px";
        result.querySelector(".sprite_container").style.height = (height-30) + "px";
    } else {
        result = objectPrototype.cloneNode(true);
        result.querySelector(".name").textContent = "Unknown";
        result.querySelector(".sprite_container").style.width = width + "px";
        result.querySelector(".sprite_container").style.height = (height-30) + "px";
    }
    return result;
};

function getSpritePos(obj, idx) {
    var result = {
        x: obj.sprites[idx].x - obj.sprites[idx].info.centerX,
        y: obj.sprites[idx].y - obj.sprites[idx].info.centerY
    };

    return result;
}

function getObjectName(obj, numUsed) {
    var nameNumUsed = (obj.additive ? numUsed : obj.numUses - numUsed);
    var numUsedString = "";
    if (nameNumUsed > 0) {
        numUsedString = " [";
        numUsedString += nameNumUsed;
        numUsedString += "]";
    }
    return obj.name + numUsedString;
}

function createObjectElement(obj, width, height, withInfo, nameType, numUsed) {
    numUsed = numUsed || 0;
    if (height && nameType != "none") {
        height -= 30;
    }
    var el = objectPrototype.cloneNode(true);
    el.setAttribute("title", getObjectName(obj, numUsed));
    el.setAttribute("data-obj-id", obj.id);
    var biomeEls = el.querySelector(".biomes").children;
    for (var i = 0; i < biomeEls.length; ++i) {
        if (obj.biomes[i]) {
            biomeEls[i].style.display = "block";
        }
    }

    var spriteContainer = el.querySelector(".sprite_container");
    var minX = 1000000;
    var maxX = -1000000;
    var minY = 1000000;
    var maxY = -1000000;
    for (var i = 0; i < obj.sprites.length; ++i) {
        var w = obj.sprites[i].info.width;
        var h = obj.sprites[i].info.height;
        var pos = getSpritePos(obj, i);
        pos.x += (obj.sprites[i].hFlip ? 1 : -1) * obj.sprites[i].info.anchorX;
        pos.y += obj.sprites[i].info.anchorY;
        minX = Math.min(pos.x, minX);
        maxX = Math.max(pos.x + w, maxX);
        minY = Math.min(pos.y, minY);
        maxY = Math.max(pos.y + h, maxY);
    }
    var spriteWidth = maxX - minX;
    var spriteHeight = maxY - minY;
    var paddingX = 0;
    var paddingY = 0;
    var xScale = 1;
    var yScale = 1;
    if (height && spriteHeight > height) {
        yScale = height/spriteHeight;
    }
    if (width && spriteWidth > width) {
        xScale = width/spriteWidth;
    }
    var scale = Math.min(xScale, yScale);
    if (scale < 1) {
        var newWidth = Math.floor(spriteWidth*scale);
        var newHeight = Math.floor(spriteHeight*scale);
        if (width) {
            paddingX = (width-newWidth)/2;
        }
        if (height) {
            paddingY = (height-newHeight)/2;
        }
        spriteContainer.style.transform = "scale(" + scale + ") translate(" + -(spriteWidth-newWidth)/2 + "px, " + (spriteHeight-newHeight)/2 + "px)";
        spriteContainer.style.width = (width ? width : newWidth) + "px";
        spriteContainer.style.height = (height ? height : newHeight) + "px";
    } else {
        if (width) {
            paddingX = (width-spriteWidth)/2;
        }
        if (height) {
            paddingY = (height-spriteHeight)/2;
        }
        spriteContainer.style.width = (width ? width : spriteWidth) + "px";
        spriteContainer.style.height = (height ? height : spriteHeight) + "px";
    }
    var nameEl = el.querySelector(".name");
    if (nameType == "none") {
        el.removeChild(nameEl);
    } else {
        nameEl.textContent = getObjectName(obj, numUsed);
        if (nameType != "long") {
            nameEl.style.width = spriteContainer.style.width;
        }
    }
    if (withInfo) {
        var infoText = "";
        if (obj.heat > 0) {
            infoText += "\n🔥 " + obj.heat;
        }
        if (obj.clothing != "n") {
            var clothingLookup = {
                b: "Bottom",
                p: "Backpack",
                h: "Hat",
                t: "Top",
                s: "Shoe"
            };
            var clothingType = clothingLookup[obj.clothing] || "Unknown";
            infoText += "\n👕 " + clothingType;
        }
        if (obj.rValue > 0) {
            infoText += "\n☀️ " + obj.rValue;
        }
        if (obj.speed != 1.0) {
            infoText += "\n🏃 " + obj.speed;
        }
        if (obj.food > 0) {
            infoText += "\n🍕 " + obj.food;
        }
        if (obj.numSlots > 0) {
            infoText += "\n📦 " + obj.numSlots;
        }
        if (obj.numUses > 1) {
            infoText += "\n🖐️ " + obj.numUses;
        }
        if (infoText.length > 0) {
            infoText = infoText.slice(1);
            var infoEl = el.querySelector(".info");
            infoEl.textContent = infoText;
            infoEl.style.display = "block";
        }
    }
    for (var i = 0; i < obj.sprites.length; ++i) {
        var img = document.createElement("DIV");
        var spriteId = obj.sprites[i].id;
        // img.style.backgroundImage = "url(sprites/" + spriteId + ".png)";
        img.style.backgroundImage = "url(spritesheet.png)";
        img.style.backgroundPosition = -obj.sprites[i].info.x + "px " + -obj.sprites[i].info.y + "px";
        img.style.width = obj.sprites[i].info.width;
        img.style.height = obj.sprites[i].info.height;
        var pos = getSpritePos(obj, i);
        img.style.left = -minX + paddingX + pos.x + "px";
        img.style.bottom = -minY + paddingY + pos.y + "px";
        var transform = "";
        transform += "rotate(" + obj.sprites[i].rot + "turn) ";
        if (obj.sprites[i].hFlip) {
            transform += "scaleX(-1) ";
        }
        transform += "translate(" + -obj.sprites[i].info.anchorX + "px, " + -obj.sprites[i].info.anchorY + "px)";
        img.style.transform = transform;
        if (!obj.name.startsWith("@") && (obj.sprites[i].r != 1.0 || obj.sprites[i].g != 1.0 || obj.sprites[i].b != 1.0)) {
            var r = Math.floor(255*obj.sprites[i].r);
            var g = Math.floor(255*obj.sprites[i].g);
            var b = Math.floor(255*obj.sprites[i].b);
            img.style.backgroundColor = "rgb(" + r + ", " + g + ", " + b + ")";
            img.style.backgroundBlendMode = "multiply";
            // img.style.mask = "url(sprites/" + spriteId + ".png)";
            img.style.mask = "url(spritesheet.png) " + -obj.sprites[i].info.x + "px " + -obj.sprites[i].info.y + "px";
            img.style["-webkit-mask"] = img.style.mask;
        }
        spriteContainer.appendChild(img);
    }

    if (obj.spriteAppearOrder) {
        for (var i = 0; i < obj.spriteAppearOrder.length; ++i) {
            var spriteIdx = obj.spriteAppearOrder[i];
            if (i >= numUsed) {
                spriteContainer.children[spriteIdx].style.display = "none";
            } else {
                spriteContainer.children[spriteIdx].style.display = "block";
            }
        }
    }
    if (obj.spriteHideOrder) {
        for (var i = 0; i < obj.spriteHideOrder.length; ++i) {
            var spriteIdx = obj.spriteHideOrder[i];
            if (obj.spriteHideOrder.length - i - 1 >= numUsed) {
                spriteContainer.children[spriteIdx].style.display = "block";
            } else {
                spriteContainer.children[spriteIdx].style.display = "none";
            }
        }
    }

    return el;
}

function prettyTimeString(seconds) {
    var result = "";
    if (seconds >= 0) {
        var hours = Math.floor(seconds / (60*60));
        var minutes = Math.floor(seconds / 60) % 60;
        var seconds = seconds % 60;

        if (hours > 0 && minutes == 0 && seconds == 0) {
            result = hours + " Hour" + (hours > 1 ? "s" : "");
        } else if (minutes > 0 && hours == 0 && seconds == 0) {
            result = minutes + " Minute" + (minutes > 1 ? "s" : "");
        } else if (seconds > 0 && hours == 0 && minutes == 0) {
            result = seconds + " Second" + (seconds > 1 ? "s" : "");
        } else {
            result = seconds + "s";
            if (minutes > 0) {
                result = minutes + "m " + result;
            }
            if (hours > 0) {
                result = hours + "h " + result;
            }
        }
    } else {
        result = -seconds + " Lifetime" + (seconds < -1 ? "s" : "");
    }

    return result;
}


var page = new Page();
var dataLoader = new DataLoader();
dataLoader.addOnLoadCallback(function(data) {
    page.setData(data);
});
