#!/bin/bash

# App scripts
# http://webostv.developer.lge.com/sdk/tools/using-webos-tv-cli

# Mac
if [[ "$OSTYPE" == "darwin"* ]]; then
    export ARES_SDK="/opt/webOS_TV_SDK/CLI/bin"
# Linux
else
    export ARES_SDK="/usr/local/share/webOS_TV_SDK/CLI/bin"
fi

# Others
export ID="com.crunchyroll.webos"
export DEVICE="tv"
export VERSION="1.3.0"

# TV METHODS
function list_device(){
    $ARES_SDK/ares-setup-device -list
}

function setup_device(){
    $ARES_SDK/ares-setup-device
}

function get_key(){
    $ARES_SDK/ares-novacom --device $DEVICE --getkey
}

function check_device(){
    $ARES_SDK/ares-install --device $DEVICE --list
}

# APP METHODS
function build(){
    $ARES_SDK/ares-package $ID --outdir ./bin
}

function install(){
    $ARES_SDK/ares-install -s internal --device $DEVICE ./bin/${ID}_${VERSION}.ipk
}

function launch(){
    $ARES_SDK/ares-launch --device $DEVICE $ID
}

function inspect(){
    $ARES_SDK/ares-inspect --device $DEVICE --app $ID
}

function deploy(){
    build && install
}

function test(){
    build && install && launch && inspect
}

eval "$1"
