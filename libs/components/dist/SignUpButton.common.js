/******/ (function() { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 433:
/***/ (function(__unused_webpack_module, exports) {

var __webpack_unused_export__;

__webpack_unused_export__ = ({ value: true });
// runtime helper for setting properties on components
// in a tree-shakable way
exports.A = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
        target[key] = val;
    }
    return target;
};


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
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
;// CONCATENATED MODULE: ../../node_modules/thread-loader/dist/cjs.js!../../node_modules/ts-loader/index.js??clonedRuleSet-40.use[1]!../../node_modules/vue-loader/dist/templateLoader.js??ruleSet[1].rules[3]!../../node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./src/SignUpButton.vue?vue&type=template&id=34c3d1a1&ts=true

function render(_ctx, _cache, $props, $setup, $data, $options) {
    const _component_Button = (0,external_vue_namespaceObject.resolveComponent)("Button");
    return ((0,external_vue_namespaceObject.openBlock)(), (0,external_vue_namespaceObject.createElementBlock)("div", {
        class: "signUp-button",
        onClick: _cache[0] || (_cache[0] =
            //@ts-ignore
            (...args) => (_ctx.signUp && _ctx.signUp(...args)))
    }, [
        (0,external_vue_namespaceObject.renderSlot)(_ctx.$slots, "default", {}, () => [
            (0,external_vue_namespaceObject.createVNode)(_component_Button, null, {
                default: (0,external_vue_namespaceObject.withCtx)(() => [
                    (0,external_vue_namespaceObject.createTextVNode)("Sign Up for Solid!")
                ]),
                _: 1
            })
        ])
    ]));
}

;// CONCATENATED MODULE: ./src/SignUpButton.vue?vue&type=template&id=34c3d1a1&ts=true

;// CONCATENATED MODULE: ../../node_modules/thread-loader/dist/cjs.js!../../node_modules/ts-loader/index.js??clonedRuleSet-40.use[1]!../../node_modules/vue-loader/dist/index.js??ruleSet[0].use[0]!./src/SignUpButton.vue?vue&type=script&lang=ts

/* harmony default export */ var SignUpButtonvue_type_script_lang_ts = ((0,external_vue_namespaceObject.defineComponent)({
    name: "SignUpButton",
    setup() {
        const width = 1200;
        const height = 800;
        const signUp = () => {
            window.open("https://solidproject.org//users/get-a-pod", "SignUp", `
      scrollbars=yes,
      top=${(screen.height - height) / 2}, 
      left=${(screen.width - width) / 2},
      width=${width}, 
      height=${height}
      `);
            // window.close();
        };
        return { signUp };
    },
}));

;// CONCATENATED MODULE: ./src/SignUpButton.vue?vue&type=script&lang=ts
 
// EXTERNAL MODULE: ../../node_modules/vue-loader/dist/exportHelper.js
var exportHelper = __webpack_require__(433);
;// CONCATENATED MODULE: ./src/SignUpButton.vue




;
const __exports__ = /*#__PURE__*/(0,exportHelper/* default */.A)(SignUpButtonvue_type_script_lang_ts, [['render',render]])

/* harmony default export */ var SignUpButton = (__exports__);
;// CONCATENATED MODULE: ../../node_modules/@vue/cli-service/lib/commands/build/entry-lib.js


/* harmony default export */ var entry_lib = (SignUpButton);


module.exports = __webpack_exports__["default"];
/******/ })()
;
//# sourceMappingURL=SignUpButton.common.js.map