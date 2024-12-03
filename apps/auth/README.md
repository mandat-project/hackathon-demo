# auth

This is a standalone application. This means all its dependencies are defined in its package.json directly. 
It is not inheriting any deps (or should not) from the root of this monorepo!

Furthermore, due to the fact, that we don't publish the shared libraries on npm or so, we use a direct github.com 
URI as a dependency for this application (and the others). For that reason, you need to push your changes and run 
npm install (e.g. `npm i github:mandat-project/hackathon-demo#BRANCHNAME -w apps/auth`) afterward, to get the latest 
library versions from GitHub.

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Run your unit tests
```
npm run test
```

### Run your end-to-end tests
```
npm run test:e2e
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
