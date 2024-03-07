# PrimeVue Theming with SASS

Visit the [official documentation](https://primevue.org/theming/#customtheme) for more information.

## Compile SCSS Manually
Once your theme is ready run the following command to compile it. Note that [sass](https://www.npmjs.com/package/sass) command should be available in your terminal.

To install Sass open Git Bash as an administrator and run:

```
npm install -g sass
```

Then go to the ```src``` folder and run:

```
sass --update themes/mytheme/theme.scss:themes/mytheme/theme.css
```
      
Then copy and import the theme.css file in your application. For example, in a Vite based template like create-vue, you may place theme.css under assets folder and then import it an main.js.

```
import './assets/theme.css';
```

## Build Time Compilation
This approach eliminates the manual compilation by delegating it to your build environment that has the ability to compile SCSS. Copy the theme-base folder along with themes/mytheme folder to your application where assets reside. At a suitable location like main.js or App.vue, import the theme.scss from assets/themes/mytheme. That would be it, during build time, your project will compile the sass and import the theme. Any changes to your theme will be reflected instantly.