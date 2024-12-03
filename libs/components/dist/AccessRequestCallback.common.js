/******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	!function() {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = function(exports, definition) {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	!function() {
/******/ 		__webpack_require__.o = function(obj, prop) { return Object.prototype.hasOwnProperty.call(obj, prop); }
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	!function() {
/******/ 		__webpack_require__.p = "";
/******/ 	}();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "default": function() { return /* binding */ entry_lib; }
});

;// CONCATENATED MODULE: ../../node_modules/@vue/cli-service/lib/commands/build/setPublicPath.js
/* eslint-disable no-var */
// This file is imported into lib/wc client bundles.

if (typeof window !== 'undefined') {
  var currentScript = window.document.currentScript
  if (false) { var getCurrentScript; }

  var src = currentScript && currentScript.src.match(/(.+\/)[^/]+\.js(\?.*)?$/)
  if (src) {
    __webpack_require__.p = src[1] // eslint-disable-line
  }
}

// Indicate to webpack that this file can be concatenated
/* harmony default export */ var setPublicPath = (null);

;// CONCATENATED MODULE: external "vue"
var external_vue_namespaceObject = require("vue");
;// CONCATENATED MODULE: ../../node_modules/thread-loader/dist/cjs.js!../../node_modules/ts-loader/index.js??clonedRuleSet-40.use[1]!../../node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./src/AccessRequestCallback.vue?vue&type=script&setup=true&lang=ts


/* harmony default export */ var AccessRequestCallbackvue_type_script_setup_true_lang_ts = (/*#__PURE__*/(0,external_vue_namespaceObject.defineComponent)({
    __name: 'AccessRequestCallback',
    props: {
        uri: {},
        result: {},
        onResult: { type: Function }
    },
    setup(__props) {
        const props = __props; // access request URI and decision result
        if (typeof props.onResult === "function") {
            props.onResult(props.uri, props.result);
        }
        return (_ctx, _cache) => {
            return ((0,external_vue_namespaceObject.openBlock)(), (0,external_vue_namespaceObject.createElementBlock)("div", null, "Access Request has been handled. You are being redirected. Hang on."));
        };
    }
}));

;// CONCATENATED MODULE: ./src/AccessRequestCallback.vue?vue&type=script&setup=true&lang=ts
 
;// CONCATENATED MODULE: ./src/AccessRequestCallback.vue



const __exports__ = AccessRequestCallbackvue_type_script_setup_true_lang_ts;

/* harmony default export */ var AccessRequestCallback = (__exports__);
;// CONCATENATED MODULE: ../../node_modules/@vue/cli-service/lib/commands/build/entry-lib.js


/* harmony default export */ var entry_lib = (AccessRequestCallback);


module.exports = __webpack_exports__["default"];
/******/ })()
;
//# sourceMappingURL=AccessRequestCallback.common.js.map