# Web

Web interfaces for StuStaPay.

## Installation

Use `npm` to install and update dependencies.

- run `npm install`

## Development

Openapi code generation

```shell
npx @rtk-query/codegen-openapi openapi-config.ts
```

## Running

### Administration

To start the StuStaPay administration site:

- `npm run start` (internally, this calls `nx serve administration`)
- go to http://localhost:4200/ for development, it supports autoreload!
