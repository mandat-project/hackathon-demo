# @shared/components

This is a monorepo library and the package.json may not include all the actual dependencies.

It uses the vue-cli service to build library files for CommonJS and UMD. You can just import and use 
`@shared/components` or for the GitHub dep `@datev-research/mandat-shared-components`.

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
Creates bundles in "dist" folder. See package.json exports for more information.

Note, when building a component it normally includes and bundles all its dependencies into that file. This is 
sometimes not needed, because the application will define its own dependency and therefore will have it included 
already.
For that you can tell webpack not to include some of these externals in the `vue.config.js`,
see `configureWebpack.externals`. It is recommended that you check the folder size of "dist" before and after you 
made your changes. If it increased dramatically, then you should check your external dependencies. 

```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
