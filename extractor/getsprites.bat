@echo off
IF "%1" == "" (
    echo Usage: %0 [path-to-game]
    exit /b
)

IF NOT EXIST .\sprites (
    mkdir sprites
)
copy %1\sprites\*.tga .\sprites
pushd
cd sprites
magick mogrify -format png @..\sprite_list.txt
del *.tga
popd
