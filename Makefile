.DEFAULT_GOAL := help

.PHONY: help dependencies build appimage test

help:
	@printf 'Available commands:\n'
	@printf '  make build     Build the application\n'
	@printf '  make appimage  Build a Linux AppImage in dist/\n'
	@printf '  make test      Run the test suite\n'

dependencies:
	@if [ ! -x node_modules/.bin/electron-vite ] || [ ! -x node_modules/.bin/electron-builder ]; then \
		echo 'Installing project dependencies...'; \
		pnpm install --frozen-lockfile; \
	fi

build: dependencies
	pnpm build

appimage: dependencies build
	pnpm exec electron-builder --linux AppImage --publish never
	@find dist -maxdepth 1 -type f -name '*.AppImage' -printf 'Created: %p\n'

test:
	pnpm test
