
var maxBiome = 0;
var transitions = [];
var objects = [];
var spriteInfo = [];
var techTree = [];
var dataLoaded = false;
var techTreeReady = false;
var techTreeFilterCategory = null;

var techTreeRender = null;

var searchEl = document.getElementById("search");
var resultsEl = document.querySelector(".results");

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
objectPrototype.appendChild(biomesContainer);

var spriteContainer = document.createElement("DIV");
spriteContainer.classList.add("sprite_container");
objectPrototype.appendChild(spriteContainer);

var nameEl = document.createElement("SPAN");
nameEl.classList.add("name");
objectPrototype.appendChild(nameEl);

var techTreeLevelPrototype = document.createElement("DIV");
techTreeLevelPrototype.classList.add("level_container");

var techTreeLevelLabelPrototype = document.createElement("DIV");
techTreeLevelLabelPrototype.classList.add("level");
var techTreeLevelLabelSpanPrototype = document.createElement("SPAN");
techTreeLevelLabelSpanPrototype.textContent = "LEVEL";
techTreeLevelLabelPrototype.appendChild(techTreeLevelLabelSpanPrototype);
var techTreeLevelLabelNumPrototype = document.createElement("DIV");
techTreeLevelLabelNumPrototype.classList.add("num");
techTreeLevelLabelPrototype.appendChild(techTreeLevelLabelNumPrototype);
techTreeLevelPrototype.appendChild(techTreeLevelLabelPrototype);

var techTreeLevelObjectsContainerPrototype = document.createElement("DIV");
techTreeLevelObjectsContainerPrototype.classList.add("objects");
techTreeLevelPrototype.appendChild(techTreeLevelObjectsContainerPrototype);

var techTreeLevelPaddingPrototype = document.createElement("DIV");
techTreeLevelPaddingPrototype.classList.add("padding");
techTreeLevelPrototype.appendChild(techTreeLevelPaddingPrototype);

function getSpritePos(obj, idx) {
    var id = obj.sprites[idx].id;
    var result = {
        x: obj.sprites[idx].x - spriteInfo[id].centerX,
        y: obj.sprites[idx].y - spriteInfo[id].centerY
    };

    return result;
}

function createObjectElement(obj, width, height) {
    var el = objectPrototype.cloneNode(true);
    el.setAttribute("title", obj.name);
    var biomeEls = el.querySelector(".biomes").children;
    for (var i = 0; i < biomeEls.length; ++i) {
        if (obj.biomes[i]) {
            biomeEls[i].style.display = "block";
        }
    }

    var nameEl = el.querySelector(".name");
    nameEl.textContent = obj.name;
    var spriteContainer = el.querySelector(".sprite_container");
    var minX = 1000000;
    var maxX = -1000000;
    var minY = 1000000;
    var maxY = -1000000;
    for (var i = 0; i < obj.sprites.length; ++i) {
        var w = spriteInfo[obj.sprites[i].id].width;
        var h = spriteInfo[obj.sprites[i].id].height;
        var pos = getSpritePos(obj, i);
        pos.x += (obj.sprites[i].hFlip ? 1 : -1) * spriteInfo[obj.sprites[i].id].anchorX;
        pos.y += spriteInfo[obj.sprites[i].id].anchorY;
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
    for (var i = 0; i < obj.sprites.length; ++i) {
        var img = document.createElement("DIV");
        var spriteId = obj.sprites[i].id;
        img.style.backgroundImage = "url(sprites/" + spriteId + ".png)";
        img.style.width = spriteInfo[spriteId].width;
        img.style.height = spriteInfo[spriteId].height;
        var pos = getSpritePos(obj, i);
        img.style.left = -minX + paddingX + pos.x + "px";
        img.style.bottom = -minY + paddingY + pos.y + "px";
        var transform = "";
        transform += "rotate(" + obj.sprites[i].rot + "turn) ";
        if (obj.sprites[i].hFlip) {
            transform += "scaleX(-1) ";
        }
        transform += "translate(" + -spriteInfo[obj.sprites[i].id].anchorX + "px, " + -spriteInfo[obj.sprites[i].id].anchorY + "px)";
        img.style.transform = transform;
        if (obj.sprites[i].r != 1.0 || obj.sprites[i].g != 1.0 || obj.sprites[i].b != 1.0) {
            var r = Math.floor(255*obj.sprites[i].r);
            var g = Math.floor(255*obj.sprites[i].g);
            var b = Math.floor(255*obj.sprites[i].b);
            img.style.backgroundColor = "rgb(" + r + ", " + g + ", " + b + ")";
            img.style.backgroundBlendMode = "multiply";
            img.style.mask = "url(sprites/" + spriteId + ".png)";
            img.style["-webkit-mask"] = img.style.mask;
        }
        spriteContainer.appendChild(img);
    }

    return el;
}

function prettyTimeString(seconds) {
    var hours = Math.floor(seconds / (60*60));
    var minutes = Math.floor(seconds / 60) % 60;
    var seconds = seconds % 60;

    var result = seconds + "s";
    if (minutes > 0) {
        result = minutes + "m " + result;
    }
    if (hours > 0) {
        result = hours + "h " + result;
    }

    return result;
}

function techTreeSetCategory(cat) {
    techTreeFilterCategory = cat;
    var techTreeCategories = document.querySelectorAll(".search_box .categories span");
    for (var i = 0; i < techTreeCategories.length; ++i) {
        if (techTreeCategories[i].classList.contains(cat)) {
            techTreeCategories[i].classList.add("active");
        } else {
            techTreeCategories[i].classList.remove("active");
        }
    }
    runTechTreeSearch();
}

function runTechTreeSearch() {
    if (techTreeReady) {
        var query = searchEl.value.trim().toLowerCase();
        var techTreeToRender = [];
        for (var i = -1; i < techTree.length; ++i) {
            var results = [];
            for (var j = 0; j < techTree[i].length; ++j) {
                var obj = objects[techTree[i][j]];
                var pass = false;
                if (query.length == 0 || obj.searchName.includes(query)) {
                    if (techTreeFilterCategory == "all") {
                        pass = true;
                    } else if (techTreeFilterCategory == "food") {
                        pass = obj.food > 0;
                    } else if (techTreeFilterCategory == "heat_source") {
                        pass = obj.heat > 0;
                    } else if (techTreeFilterCategory == "clothing") {
                        pass = (obj.clothing != "n" && obj.rValue > 0);
                    } else if (techTreeFilterCategory == "containers") {
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

        var diff = !techTreeRender;
        if (!diff) {
            if (techTreeRender.toRender.length == techTreeToRender.length) {
                for (var i = 0; !diff && i < techTreeToRender.length; ++i) {
                    diff = (techTreeRender.toRender[i][1].length != techTreeToRender[i][1].length);
                }
            } else {
                diff = true;
            }
        }


        if (diff) {
            var techTreeEl = document.querySelector(".tech_tree");
            var newTechTreeEl = techTreeEl.cloneNode(false);
            techTreeEl.parentElement.insertBefore(newTechTreeEl, techTreeEl);
            techTreeEl.parentElement.removeChild(techTreeEl);
            techTreeEl = newTechTreeEl;

            if (techTreeRender && techTreeRender.rafHandle) {
                cancelAnimationFrame(techTreeRender.rafHandle);
            }
            techTreeRender = {
                el: techTreeEl,
                toRender: techTreeToRender,
                levelIdx: 0,
                objIdx: 0,
                curLevelEl: null,
                rafHandle: null
            };
            renderTechTree();
        }
    }
}

function renderTechTree() {
    var startTime = performance.now();
    var done = false;
    while (!done && (performance.now() - startTime) < 1) {
        done = techTreeRenderStep();
    }
    if (!done) {
        techTreeRender.rafHandle = requestAnimationFrame(renderTechTree);
    }
}

function techTreeRenderStep() {
    if (techTreeRender.levelIdx < techTreeRender.toRender.length) {
        if (techTreeRender.curLevelEl) {
            var objIds = techTreeRender.toRender[techTreeRender.levelIdx][1];
            while (techTreeRender.objIdx < objIds.length) {
                var objId = objIds[techTreeRender.objIdx++];
                techTreeRender.curLevelEl.appendChild(createObjectElement(objects[objId], 150, 120));
                if (techTreeRender.objIdx == objIds.length) {
                    techTreeRender.levelIdx++;
                    techTreeRender.objIdx = 0;
                    techTreeRender.curLevelEl = null;
                    return techTreeRender.levelIdx == techTreeRender.toRender.length;
                }
            }
        } else {
            var levelEl = techTreeLevelPrototype.cloneNode(true);
            var levelNum = techTreeRender.toRender[techTreeRender.levelIdx][0];
            levelEl.querySelector(".num").textContent = levelNum
            if (levelNum == -1) {
                levelEl.querySelector(".padding").textContent = "These objects cannot be made and they do not spawn on the map.";
            } else if (levelNum == 0) {
                levelEl.querySelector(".padding").textContent = "These objects cannot be made, but they spawn on the map. All other objects are made from these.";
            }
            techTreeRender.curLevelEl = levelEl.querySelector(".objects");
            techTreeRender.el.appendChild(levelEl);
            return false;
        }
    } else {
        return true;
    }
}

function buildTechTree() {
    techTree[-1] = [];
    techTree[0] = [];
    var sortedIds = [-2, -1, 0];
    var remaining = [];

    var creationTransitions = [];
    for (var i = 0; i < transitions.length; ++i) {
        var t = transitions[i];
        if (!([-2, -1, 0, t.actorId].includes(t.newActorId))) {
            creationTransitions[t.newActorId] = (creationTransitions[t.newActorId] || []);
            creationTransitions[t.newActorId].push([t.actorId, t.targetId, 0]);
        }
        if (!([-2, -1, 0, t.targetId].includes(t.newTargetId))) {
            creationTransitions[t.newTargetId] = (creationTransitions[t.newTargetId] || []);
            creationTransitions[t.newTargetId].push([t.actorId, t.targetId, 1]);
        }
    }

    for (var i = 0; i < objects.length; ++i) {
        if (objects[i]) {
            if (objects[i].biomes.includes(true)) {
                techTree[0].push(objects[i].id);
                sortedIds.push(objects[i].id);
            } else if (!creationTransitions[objects[i].id]) {
                if (objects[i].name[0] != "@") {
                    techTree[-1].push(objects[i].id);
                    sortedIds.push(objects[i].id);
                }
            } else if (!sortedIds.includes(objects[i].id)) {
                remaining.push(objects[i].id);
            }
        }
    }

    // TODO: Maybe transitions that only take time should be collapsed into the same tech level?
    // Should waiting for a rabbit to come out really count as an additinal tech level??
    var techLevel = 1;
    while (remaining.length > 0) {
        techTree[techLevel] = [];
        var rest = [];
        var newSortedIds = [];
        for (var i = 0; i < remaining.length; ++i) {
            var id = remaining[i];
            var found = false;
            var ct = creationTransitions[id];
            if (ct) {
                for (var t = 0; t < ct.length; ++t) {
                    if (!objects[id].held) {
                        // This is really bad. We need a separate dependency crawl for the biomes.
                        for (var b = 0; b <= maxBiome; ++b) {
                            var objType = ct[t][2];
                            if (objects[ct[t][objType]] && !objects[ct[t][objType]].held) {
                                objects[id].biomes[b] |= objects[ct[t][objType]].biomes[b];
                            }
                        }
                    }
                    if (!found) {
                        if (sortedIds.includes(ct[t][0]) && sortedIds.includes(ct[t][1])) {
                            techTree[techLevel].push(id);
                            newSortedIds.push(id);
                            if (objects[id].categories && objects[id].categories.length > 0) {
                                for (var cat = 0; cat < objects[id].categories.length; ++cat) {
                                    newSortedIds.push(objects[id].categories[cat]);
                                }
                            }
                            found = true;
                        }
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

    techTreeReady = true;
    runTechTreeSearch();
}

var categoryAll = document.querySelector(".search_box .categories .all");
categoryAll.addEventListener("click", function(ev) {
    techTreeSetCategory("all");
});
var categoryFood = document.querySelector(".search_box .categories .food");
categoryFood.addEventListener("click", function(ev) {
    techTreeSetCategory("food");
});
var categoryClothing = document.querySelector(".search_box .categories .clothing");
categoryClothing.addEventListener("click", function(ev) {
    techTreeSetCategory("clothing");
});
var categoryHeatSource = document.querySelector(".search_box .categories .heat_source");
categoryHeatSource.addEventListener("click", function(ev) {
    techTreeSetCategory("heat_source");
});
var categoryContainers = document.querySelector(".search_box .categories .containers");
categoryContainers.addEventListener("click", function(ev) {
    techTreeSetCategory("containers");
});


searchEl.addEventListener("input", function(ev) {
    runTechTreeSearch();
});

techTreeSetCategory("all");

var xhr = new XMLHttpRequest();
xhr.addEventListener("load", function() {
    var body = xhr.response;
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
                    maxBiome = parseInt(line.slice(9), 10);
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
                    lastUseActor: parseInt(parts[5], 10),
                    lastUseTarget: parseInt(parts[6], 10)
                };
                transitions.push(transition);
            }
        }
        if (mode == "spriteInfo") {
            if (line == "=====") {
                mode = "objects";
            } else {
                var parts = line.split(" ");
                var info = {
                    width: parseInt(parts[1], 10),
                    height: parseInt(parts[2], 10),
                    centerX: parseInt(parts[3], 10),
                    centerY: parseInt(parts[4], 10),
                    anchorX: parseInt(parts[5], 10),
                    anchorY: parseInt(parts[6], 10)
                };

                spriteInfo[parseInt(parts[0], 10)] = info;
            }
        }
        if (mode == "objects") {
            if (line == "=====") {
                if (curObj) {
                    objects[curObj.id] = curObj;
                }
                curObj = {
                    id: -100,
                    name: "",
                    searchName: "",
                    containSize: 0,
                    biomes: [],
                    categories: [],
                    heat: 0,
                    rValue: 0.0,
                    food: 0,
                    speed: 0.0,
                    clothing: "n",
                    numSlots: 0,
                    pixHeight: 0,
                    held: 0,
                    sprites: []
                };
                for (var b = 0; b <= maxBiome; ++b) {
                    curObj.biomes.push(false);
                }
            } else if (line.length > 0) {
                if (line.startsWith("id=")) {
                    curObj.id = parseInt(line.slice(3), 10);
                } else if (line.startsWith("name=")) {
                    curObj.name = line.slice(5);
                    curObj.searchName = curObj.name.toLowerCase();
                } else if (line.startsWith("containSize=")) {
                    curObj.containSize = parseInt(line.slice(12));
                } else if (line.startsWith("biomes=")) {
                    var biomes = line.slice(7).split(",");
                    for (var b = 0; b < biomes.length; ++b) {
                        curObj.biomes[parseInt(biomes[b], 10)] = true;
                    }
                } else if (line.startsWith("categories=")) {
                    var cats = line.slice(11).split(",");
                    for (var c = 0; c < cats.length; ++c) {
                        curObj.categories.push(parseInt(cats[c], 10));
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
                } else if (line.startsWith("numSprites=")) {
                    // Unused
                } else if (line.startsWith("pixHeight=")) {
                    curObj.pixHeight = parseInt(line.slice(10), 10);
                } else if (line.startsWith("held=")) {
                    curObj.held = parseInt(line.slice(5), 10);
                } else if (line.startsWith("sprite=")){ 
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
                        b: parseFloat(parts[8])
                    };
                    curObj.sprites.push(sprite);
                } else {
                    console.error("Unknown param on line", i+1);
                }
            }
        }
    }
    dataLoaded = true;
    buildTechTree();
});
xhr.addEventListener("error", function() {
    console.error("Oh no!");
});
xhr.open("GET", "data.txt");
xhr.setRequestHeader("Content-Type", "text/plain");
xhr.send();

