@echo off
rmdir /Q /S OneLifeData7
call git clone -b master --single-branch --depth 1 git@github.com:jasonrohrer/OneLifeData7.git
call main.exe %CD%\OneLifeData7\
call getsprites.bat %CD%\OneLifeData7\
