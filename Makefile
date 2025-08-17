all: deploy

VERSION := $(shell grep '"version"' pxt.json | head -1 | sed -E 's/.*"version": *"([^"]+)".*/\1/')

# Initial setup 
setup: 
	npm install -g pxt
	pxt target microbit
	pxt install

build:
	GITHUB_ACCESS_TOKEN=$(GITHUB_TOKEN) PXT_FORCE_LOCAL=1 pxt build

deploy:
	GITHUB_ACCESS_TOKEN=$(GITHUB_TOKEN) PXT_FORCE_LOCAL=1 pxt deploy

test:
	GITHUB_ACCESS_TOKEN=$(GITHUB_TOKEN) PXT_FORCE_LOCAL=1 pxt deploy


push: build 
	git commit --allow-empty -a -m "Release version $(VERSION)"
	git push
	git tag v$(VERSION) 
	git push --tags

