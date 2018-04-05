#include <windows.h>

#include <string.h>
#include <stdio.h>

#define _CRT_SECURE_NO_WARNINGS 1

struct Transition {
    int actorId;
    int targetId;
    int newActorId;
    int newTargetId;
    int timer;
    bool lastUseActor;
    bool lastUseTarget;
};

struct SpriteInfo {
    int id;
    int width;
    int height;
    int centerX;
    int centerY;
    int anchorX;
    int anchorY;
};

struct Sprite {
    int id;
    float x;
    float y;
    float rot;
    bool hFlip;
    int parent;
    float r;
    float g;
    float b;
};

struct Object {
    char name[1000];
    int permanent;
    int numCategories;
    int categories[10];
    int id;
    int containSize;
    bool biomes[10];
    int heat;
    float rValue;
    int food;
    float speed;
    char clothing;
    int numSlots;
    int numSprites;
    Sprite sprites[100];
    int pixHeight;
    float heldX;
    float heldY;
};

struct Category {
    int id;
    int numObjects;
    int objIds[100];
};

int main(int argc, char* argv[]) {
    if (argc != 2) {
        printf("Usage: %s [path-to-game-folder]\n", argv[0]);
        return 1;
    }

    bool requiredObjects[100000];
    int maxObjId = -1;
    bool requiredSprites[100000];
    int maxSpriteId = -1;
    int numTransitions = 0;
    Transition *transitions = (Transition *)malloc(sizeof(Transition) * 10000);
    Object *objects = (Object *)malloc(sizeof(Object) * 100000);
    memset(objects, 0, sizeof(Object) * 100000);
    int numCategories = 0;
    Category *categories = (Category *)malloc(sizeof(Category) * 100);
    int maxBiome = 0;

    int numSpriteInfo = 0;
    SpriteInfo *spriteInfos = (SpriteInfo *)malloc(sizeof(SpriteInfo) * 100000);

#define FILE_CONTENTS_MAX 2000000
    char *fileContents = (char *)malloc(sizeof(char) * FILE_CONTENTS_MAX);

    char *gamePath = argv[1]; // Is argv in ASCII??
    WIN32_FIND_DATA findData;
    HANDLE findHandle;


    printf("Eating categories...\n");
    char searchString[MAX_PATH];
    char categoriesFolder[MAX_PATH];
    sprintf(categoriesFolder, "%s\\categories", gamePath);
    sprintf(searchString, "%s\\*.txt", categoriesFolder);

    findHandle = FindFirstFileA(searchString, &findData);

    if (findHandle == INVALID_HANDLE_VALUE) {
        printf("ERROR finding first category file\n");
        return 1;
    }

    do {
        char filename[MAX_PATH];
        sprintf(filename, "%s\\%s", categoriesFolder, findData.cFileName);
        HANDLE fileHandle = CreateFileA(filename, GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);
        if (fileHandle == INVALID_HANDLE_VALUE) {
            printf("ERROR opening category file %s\n", filename);
            continue;
        }

        memset(fileContents, 0, FILE_CONTENTS_MAX);
        if (ReadFile(fileHandle, fileContents, FILE_CONTENTS_MAX, NULL, NULL) == 0) {
            printf("ERROR reading category file %s\n", filename);
            continue;
        }
        CloseHandle(fileHandle);

        Category cat = {0};
        char *fileCursor = fileContents;
        int amountRead = 0;
        sscanf(fileCursor, "parentID=%d\n%n", &cat.id, &amountRead);
        requiredObjects[cat.id] = true;
        maxObjId = (maxObjId < cat.id ? cat.id : maxObjId);
        fileCursor += amountRead;
        sscanf(fileCursor, "numObjects=%d\n%n", &cat.numObjects, &amountRead);
        fileCursor += amountRead;
        for (int i = 0; i < cat.numObjects; ++i) {
            sscanf(fileCursor, "%d\n%n", &cat.objIds[i], &amountRead);
            int objId = cat.objIds[i];
            requiredObjects[objId] = true;
            maxObjId = (maxObjId < objId ? objId : maxObjId);
            objects[objId].categories[objects[objId].numCategories++] = cat.id;
            fileCursor += amountRead;
        }
        categories[numCategories++] = cat;
    } while (FindNextFileA(findHandle, &findData) != 0);

    printf("Eating transitions...\n");
    char transitionFolder[MAX_PATH];
    sprintf(transitionFolder, "%s\\transitions", gamePath);

    memset(searchString, 0, sizeof(searchString));
    sprintf(searchString, "%s\\*.txt", transitionFolder);
    findHandle = FindFirstFileA(searchString, &findData);

    if (findHandle == INVALID_HANDLE_VALUE) {
        printf("ERROR finding first transition file\n");
        return 1;
    }

    do {
        char filename[MAX_PATH];
        sprintf(filename, "%s\\%s", transitionFolder, findData.cFileName); // Is cFileName in ASCII??
        HANDLE fileHandle = CreateFileA(filename, GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);
        if (fileHandle == INVALID_HANDLE_VALUE) {
            printf("ERROR opening file %s\n", filename);
            continue;
        }

        memset(fileContents, 0, FILE_CONTENTS_MAX);
        if (ReadFile(fileHandle, fileContents, FILE_CONTENTS_MAX, NULL, NULL) == 0) {
            printf("ERROR reading file %s\n", filename);
            continue;
        }
        CloseHandle(fileHandle);

        Transition tr = {0};
        sscanf(findData.cFileName, "%d_%d", &tr.actorId, &tr.targetId);
        if (strstr(findData.cFileName, "LA") != 0) {
            tr.lastUseActor = true;
        } else if (strstr(findData.cFileName, "L") != 0) {
            tr.lastUseTarget = true;
        }

        sscanf(fileContents, "%d %d %d", &tr.newActorId, &tr.newTargetId, &tr.timer);
        transitions[numTransitions++] = tr;
        if (tr.actorId >= 0) {
            int id = tr.actorId;
            requiredObjects[id] = true;
            maxObjId = (maxObjId < id ? id : maxObjId);
        }
        if (tr.targetId >= 0) {
            int id = tr.targetId;
            requiredObjects[id] = true;
            maxObjId = (maxObjId < id ? id : maxObjId);
        }
        if (tr.newActorId >= 0) {
            int id = tr.newActorId;
            requiredObjects[id] = true;
            maxObjId = (maxObjId < id ? id : maxObjId);
        }
        if (tr.newTargetId >= 0) {
            int id = tr.newTargetId;
            requiredObjects[id] = true;
            maxObjId = (maxObjId < id ? id : maxObjId);
        }
    } while (FindNextFileA(findHandle, &findData) != 0);

    printf("Eating objects...\n");

    for (int i = 0; i <= maxObjId; ++i) {
        if (!requiredObjects[i]) {
            continue;
        }
        char filename[MAX_PATH];
        sprintf(filename, "%s\\objects\\%d.txt", gamePath, i);
        HANDLE fileHandle = CreateFileA(filename, GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);
        if (fileHandle == INVALID_HANDLE_VALUE) {
            printf("ERROR opening file %s\n", filename);
            requiredObjects[i] = false;
            continue;
        }

        memset(fileContents, 0, FILE_CONTENTS_MAX);
        if (ReadFile(fileHandle, fileContents, FILE_CONTENTS_MAX, NULL, NULL) == 0) {
            printf("ERROR reading file %s\n", filename);
            requiredObjects[i] = false;
            continue;
        }

        CloseHandle(fileHandle);

        Object obj = {0};
        char line[1000];
        char *cursor = fileContents;
        int lineNum = 0;
        int spriteIdx = -1;
        while (*cursor) {
            memset(line, 0, sizeof(line));
            char *lineCursor = line;
            while (*cursor && *cursor != '\n' && *cursor != '\r') {
                *lineCursor++ = *cursor++;
            }
            while (*cursor && (*cursor == '\n' || *cursor == '\r')) {
                cursor++;
            }

            if (lineNum == 1) {
                char *nameCursor = obj.name;
                lineCursor = line;
                while (*lineCursor) {
                    *nameCursor++ = *lineCursor++;
                }
            } else {
                if (strstr(line, "id=")) {
                    obj.id = atoi(line+3);
                } else if (strstr(line, "permanent=")) {
                    obj.permanent = atoi(line+strlen("permanent="));
                } else if (strstr(line, "containSize=")) {
                    obj.containSize = atoi(line+strlen("containSize="));
                } else if (strstr(line, "mapChance=")) {
                    if (atof(line + strlen("mapChance=")) > 0.0f) {
                        lineCursor = strstr(line, "biomes") + strlen("biomes_");
                        while (*lineCursor) {
                            int biomeIdx = atoi(lineCursor);
                            maxBiome = (biomeIdx > maxBiome ? biomeIdx : maxBiome);
                            obj.biomes[biomeIdx] = true;
                            lineCursor += 2;
                        }
                    }
                } else if (strstr(line, "heatValue=")) {
                    obj.heat = atoi(line + strlen("heatValue="));
                } else if (strstr(line, "rValue=")) {
                    obj.rValue = (float)atof(line + strlen("rValue="));
                } else if (strstr(line, "foodValue=")) {
                    obj.food = atoi(line + strlen("foodValue="));
                } else if (strstr(line, "speedMult=")) {
                    obj.speed = (float)atof(line + strlen("speedMult="));
                } else if (strstr(line, "clothing=")) {
                    obj.clothing = *(line + strlen("clothing="));
                } else if (strstr(line, "numSlots=")) {
                    obj.numSlots = atoi(line + strlen("numSlots="));
                } else if (strstr(line, "numSprites=")) {
                    obj.numSprites = atoi(line + strlen("numSprites="));
                } else if (strstr(line, "spriteID=")) {
                    int spriteId = atoi(line + strlen("spriteID="));
                    obj.sprites[++spriteIdx].id = spriteId;
                    requiredSprites[spriteId] = true;
                    maxSpriteId = (maxSpriteId < spriteId ? spriteId : maxSpriteId);
                } else if (strstr(line, "pos=")) {
                    sscanf(line, "pos=%f,%f", &obj.sprites[spriteIdx].x, &obj.sprites[spriteIdx].y);
                } else if (strstr(line, "rot=")) {
                    obj.sprites[spriteIdx].rot = (float)atof(line + strlen("rot="));
                } else if (strstr(line, "hFlip=")) {
                    obj.sprites[spriteIdx].hFlip = atoi(line + strlen("hFlip="));
                } else if (strstr(line, "parent=")) {
                    obj.sprites[spriteIdx].parent = atoi(line + strlen("parent="));
                } else if (strstr(line, "color=")) {
                    sscanf(line + strlen("color="), "%f,%f,%f", &obj.sprites[spriteIdx].r, &obj.sprites[spriteIdx].g, &obj.sprites[spriteIdx].b);
                } else if (strstr(line, "pixHeight=")) {
                    obj.pixHeight = atoi(line + strlen("pixHeight="));
                } else if (strstr(line, "heldOffset=")) {
                    sscanf(line + strlen("heldOffset="), "%f,%f", &obj.heldX, &obj.heldY);
                }
            }
            lineNum++;
        }

        obj.numCategories = objects[i].numCategories;
        memcpy(obj.categories, objects[i].categories, sizeof(obj.categories));
        objects[i] = obj;
    }

    printf("Eating sprites...\n");

    for (int i = 0; i <= maxSpriteId; ++i) {
        if (requiredSprites[i]) {
            SpriteInfo info;
            info.id = i;
            char filename[MAX_PATH];
            sprintf(filename, "%s\\sprites\\%d.txt", gamePath, i);
            HANDLE fileHandle = CreateFileA(filename, GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);
            if (fileHandle == INVALID_HANDLE_VALUE) {
                printf("ERROR Can't open %d.txt to get sprite data\n", i);
                continue;
            }

            memset(fileContents, 0, FILE_CONTENTS_MAX);
            if (ReadFile(fileHandle, fileContents, FILE_CONTENTS_MAX, NULL, NULL) == 0) {
                printf("ERROR Can't read %d.txt to get sprite data\n", i);
                continue;
            }
            CloseHandle(fileHandle);

            char junk1[100];
            int junk2;
            sscanf(fileContents, "%s %d %d %d", &junk1, &junk2, &info.anchorX, &info.anchorY);

            memset(filename, 0, sizeof(filename));
            sprintf(filename, "%s\\sprites\\%d.tga", gamePath, i);
            fileHandle = CreateFileA(filename, GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);
            if (fileHandle == INVALID_HANDLE_VALUE) {
                printf("ERROR Can't open %d.tga to get sprite data\n", i);
                continue;
            }

            memset(fileContents, 0, FILE_CONTENTS_MAX);
            if (ReadFile(fileHandle, fileContents, FILE_CONTENTS_MAX, NULL, NULL) == 0) {
                printf("ERROR Can't read %d.tga to get sprite data\n", i);
                continue;
            }
            CloseHandle(fileHandle);

            if (fileContents[1] != 0) {
                printf("ERROR Image has a colormap %d\n", i);
                continue;
            }

            if (fileContents[2] != 2) {
                printf("ERROR Image is not unmapped RGB %d\n", i);
            }

            short int width = *(short int *)&fileContents[12];
            short int height = *(short int *)&fileContents[14];
            info.width = width;
            info.height = height;

            if (fileContents[16] != 32) {
                spriteInfos[numSpriteInfo++] = info;
                printf("WARN Image has no alpha data %d\n", i);
                continue;
            }

            bool topDown = fileContents[17] & (1 << 5);

            char *imageDataStart = fileContents + 14;
            char *firstAlpha = imageDataStart + 3;
            int minX = info.width;
            int minY = info.height;
            int maxX = 0;
            int maxY = 0;
            for (int y = 0; y < info.height; ++y) {
                for (int x = 0; x < info.width; ++x) {
                    char *alpha = firstAlpha + (y*info.width+x)*4;
                    if (*alpha >= 64) {
                        minX = (x < minX ? x : minX);
                        minY = (y < minY ? y : minY);
                        maxX = (x > maxX ? x : maxX);
                        maxY = (y > maxY ? y : maxY);
                    }
                }
            }

            if (!topDown) {
                minY = info.height - minY;
                maxY = info.height - maxY;
            }

            info.centerX = (maxX + minX) / 2;
            info.centerY = (maxY + minY) / 2;
            spriteInfos[numSpriteInfo++] = info;
        }
    }


    printf("Pooping data file...\n");

    HANDLE writeHandle = CreateFileA("data.txt", GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);

    if (writeHandle == INVALID_HANDLE_VALUE) {
        printf("ERROR creating data file\n");
        return 1;
    }

    {
        char line[1000];
        sprintf(line, "maxBiome=%d\n=====\n", maxBiome);
        if (WriteFile(writeHandle, line, (DWORD)strlen(line), NULL, NULL) == 0) {
            printf("ERROR writing data file\n");
            return 1;
        }
    }

    for (int i = 0; i < numTransitions; ++i) {
        char line[1000];
        Transition tr = transitions[i];
        memset(line, 0, sizeof(line));
        sprintf(line, "%d %d %d %d %d %d %d\n", tr.actorId, tr.targetId, tr.newActorId, tr.newTargetId, tr.timer, (tr.lastUseActor ? 1 : 0), (tr.lastUseTarget ? 1 : 0));
        if (WriteFile(writeHandle, line, (DWORD)strlen(line), NULL, NULL) == 0) {
            printf("ERROR writing transitions file\n");
            return 1;
        }
    }

    WriteFile(writeHandle, "=====\n", 6, NULL, NULL);

    for (int i = 0; i < numSpriteInfo; ++i) {
        char line[1000];
        SpriteInfo info = spriteInfos[i];
        memset(line, 0, sizeof(line));
        sprintf(line, "%d %d %d %d %d %d %d\n", info.id, info.width, info.height, info.centerX, info.centerY, info.anchorX, info.anchorY);
        if (WriteFile(writeHandle, line, (DWORD)strlen(line), NULL, NULL) == 0) {
            printf("ERROR writing data file\n");
            return 1;
        }
    }

    WriteFile(writeHandle, "=====\n", 6, NULL, NULL);

    for (int i = 0; i <= maxObjId; ++i) {
        if (!requiredObjects[i]) {
            continue;
        }
        char objText[10000];
        char *objTextCursor = objText;
        Object obj = objects[i];
        memset(objText, 0, sizeof(objText));
        objTextCursor += sprintf(objTextCursor, "id=%d\n", obj.id);
        objTextCursor += sprintf(objTextCursor, "name=%s\n", obj.name);
        objTextCursor += sprintf(objTextCursor, "containSize=%d\n", obj.containSize);
        bool hasBiomes = false;
        for (int b = 0; b < 10; ++b) {
            if (obj.biomes[b]) {
                hasBiomes = true;
                break;
            }
        }
        if (hasBiomes) {
            objTextCursor += sprintf(objTextCursor, "biomes=");
            bool first = true;
            for (int b = 0; b < 10; ++b) {
                if (obj.biomes[b]) {
                    if (first) {
                        objTextCursor += sprintf(objTextCursor, "%d", b);
                        first = false;
                    } else {
                        objTextCursor += sprintf(objTextCursor, ",%d", b);
                    }
                }
            }
            objTextCursor += sprintf(objTextCursor, "\n");
        }
        if (obj.numCategories > 0) {
            objTextCursor += sprintf(objTextCursor, "categories=%d", obj.categories[0]);
            for (int c = 1; c < obj.numCategories; ++c) {
                objTextCursor += sprintf(objTextCursor, ",%d", obj.categories[c]);
            }
            objTextCursor += sprintf(objTextCursor, "\n");
        }
        objTextCursor += sprintf(objTextCursor, "permanent=%d\n", obj.permanent);
        objTextCursor += sprintf(objTextCursor, "heat=%d\n", obj.heat);
        objTextCursor += sprintf(objTextCursor, "rValue=%f\n", obj.rValue);
        objTextCursor += sprintf(objTextCursor, "food=%d\n", obj.food);
        objTextCursor += sprintf(objTextCursor, "speed=%f\n", obj.speed);
        objTextCursor += sprintf(objTextCursor, "clothing=%c\n", obj.clothing);
        objTextCursor += sprintf(objTextCursor, "numSlots=%d\n", obj.numSlots);
        objTextCursor += sprintf(objTextCursor, "numSprites=%d\n", obj.numSprites);
        objTextCursor += sprintf(objTextCursor, "pixHeight=%d\n", obj.pixHeight);
        objTextCursor += sprintf(objTextCursor, "held=%d\n", (obj.heldX == 0.0f && obj.heldY == 0.0f ? 0 : 1));

        for (int s = 0; s < obj.numSprites; ++s) {
            objTextCursor += sprintf(objTextCursor, "sprite=%d,%f,%f,%f,%d,%d,%f,%f,%f\n", obj.sprites[s].id, obj.sprites[s].x, obj.sprites[s].y, obj.sprites[s].rot, obj.sprites[s].hFlip ? 1 : 0, obj.sprites[s].parent, obj.sprites[s].r, obj.sprites[s].g, obj.sprites[s].b);
        }
        objTextCursor += sprintf(objTextCursor, "=====\n");

        if (WriteFile(writeHandle, objText, (DWORD)strlen(objText), NULL, NULL) == 0) {
            printf("ERROR writing object data: %d\n", i);
        }
    }

    CloseHandle(writeHandle);

    printf("Pooping sprite list...\n");

    HANDLE spriteFileHandle = CreateFileA("sprite_list.txt", GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);

    for (int i = 0; i <= maxSpriteId; ++i) {
        if (requiredSprites[i]) {
            char spriteFilename[100];
            sprintf(spriteFilename, "%d.tga\n", i);
            WriteFile(spriteFileHandle, spriteFilename, (DWORD)strlen(spriteFilename), NULL, NULL);
        }
    }

    CloseHandle(spriteFileHandle);

    return 0;
}
