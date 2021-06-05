# App scripts
# http://webostv.developer.lge.com/sdk/tools/using-webos-tv-cli

# VARIABLES
export TV_SDK=/usr/local/share/webOS_TV_SDK/CLI/bin
export ID=com.crunchyroll.webos
export DEVICE=emulator
export VERSION=1.4.0
export PROJECT_PATH=$(shell pwd)

# TV METHODS
device_list:
	$(TV_SDK)/ares-setup-device -list

device_setup:
	$(TV_SDK)/ares-setup-device

device_key:
	$(TV_SDK)/ares-novacom --device $(DEVICE) --getkey

device_check:
	$(TV_SDK)/ares-install --device $(DEVICE) --list

# APP METHODS
app_build:
	$(TV_SDK)/ares-package --no-minify $(ID) --outdir $(PROJECT_PATH)/bin

app_install:
	$(TV_SDK)/ares-install -s internal \
		--device $(DEVICE) $(PROJECT_PATH)/bin/$(ID)_$(VERSION)_all.ipk

app_launch:
	$(TV_SDK)/ares-launch --device $(DEVICE) $(ID)

app_inspect:
	$(TV_SDK)/ares-inspect --device $(DEVICE) --app $(ID)

# DEV METHODS
build:
	compactor \
		--progressive false \
		--source src/ --destination $(ID)/ \
		--exclude "css/_*.scss" \
		--bundle "css/styles.css:css/styles.scss" \
		--bundle "js/components.js:js/components/*.js"

watch:
	compactor --watch \
		--progressive false \
		--source src/ --destination $(ID)/ \
		--exclude "css/_*.scss" \
		--bundle "css/styles.css:css/styles.scss" \
		--bundle "js/components.js:js/components/*.js"

server:
	statiq --port 5000 --root $(PROJECT_PATH)/$(ID)/

develop:
	make -j 2 watch server
