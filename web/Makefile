.PHONY: web build lint typecheck test test-ci coverage
web:
	pnpm run dev --host 0.0.0.0

build:
	pnpm run build

lint:
	pnpm run lint

typecheck:
	pnpm exec tsc -b --pretty

test:
	pnpm run test

# Single-run tests suitable for CI
test-ci:
	pnpm run test:run

# Generate coverage report
coverage:
	pnpm run test:coverage
