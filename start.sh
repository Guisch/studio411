#!/bin/bash
# Recommend syntax for setting an infinite while loop
while :
do
        npm start
        killall nodejs
        killall npm
        killall Xvfb
        sleep 1
done
killall screen
