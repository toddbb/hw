import { Config } from "./modules/config.mjs";
import { Homework } from "./modules/homework.mjs";
import * as Utils from "./modules/utils.mjs";

/**
 * Method: Dom
 * Initializes and declares DOM elements after it is loaded
 */
export const Dom = {
   init() {
      /// Views
      this.views = {};
      this.views.start = document.querySelector(".view-start");
      this.views.homework = document.querySelector(".view-hw");

      /// View Start
      this.viewStart = {};
      this.viewStart.btnStart = document.querySelector(".view-start .btn");

      /// Homework
      this.homework = {};
      this.homework.modal = document.querySelector(".modal-activity");

      /// Homework Container Components (header, main, footer)
      this.homework.header = document.querySelector(".container-homework .hw-header");
      this.homework.main = {};
      this.homework.main.container = document.querySelector(".container-homework .hw-main");
      this.homework.footer = document.querySelector(".container-homework .hw-footer");

      /// Homework Main - Question Section
      this.homework.main.question = {};
      this.homework.main.question.container = document.querySelector(".hw-main-question");
      this.homework.main.question.instructions = document.querySelector(".hw-main-question .hw-main-question-instruction");
      this.homework.main.question.text = document.querySelector(".hw-main-question .hw-main-question-text");
      this.homework.main.question.img = document.querySelector(".hw-main-question .hw-main-question-img");

      /// Homework Main - Response Section
      this.homework.main.response = {};
      this.homework.main.response.container = document.querySelector(".hw-main-response");
   },
};

/**
 * Method: Events
 * Initializes event listeners
 */
export const Events = {
   init() {
      Dom.viewStart.btnStart.addEventListener("click", Homework.start);
   },
};

/**
 * Method: Views
 * View controller
 */
export const Views = {
   show(view) {
      this._hideAll();
      Utils._show(view);
   },
   _hideAll() {
      for (const view in Dom.views) {
         Utils._hide(Dom.views[view]);
      }
   },
};

/**
 * Function: init *
 * Initializes the DOM after it is loaded
 */
const init = () => {
   console.log("The DOM is loaded.");
   Dom.init();
   Events.init();

   window[Config.APP_NAME] = {};
   window[Config.APP_NAME].Dom = Dom;

   if (Config.DEV_MODE) {
      Homework.start();
   }

   console.log("ℹ️ Dom =", window[Config.APP_NAME].Dom);
};

document.addEventListener("DOMContentLoaded", () => init());
