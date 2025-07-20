import { Config } from "./modules/config.mjs";
import { Homework } from "./modules/homework.mjs";
import * as Utils from "./modules/utils.mjs";

const lesson = "SJ_A1_004"; /// temp global; later, it can be selected

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
      this.homework.header = {};
      this.homework.main = {};
      this.homework.footer = {};
      this.homework.header.container = document.querySelector(".container-homework .hw-header");
      this.homework.main.container = document.querySelector(".container-homework .hw-main");
      this.homework.footer.container = document.querySelector(".container-homework .hw-footer");

      /// Homework Main - Section (instruction, question, resposne);
      this.homework.main.section = {};
      this.homework.main.section.container = document.querySelector(".hw-main-section");

      /// Homework Main - Instruction
      this.homework.main.instruction = document.querySelector(".hw-main-instruction");

      /// Homework Main - Question Section
      this.homework.main.question = {};
      this.homework.main.question.container = document.querySelector(".hw-main-question");
      this.homework.main.question.body = document.querySelector(".hw-main-question .hw-main-question-body");

      /// Homework Main - Response Section
      this.homework.main.response = {};
      this.homework.main.response.container = document.querySelector(".hw-main-response");
      this.homework.main.response.text = document.querySelector(".hw-main-response .hw-main-response-text");

      /// Homework Footer
      this.homework.footer = {};
      this.homework.footer.container = document.querySelector(".hw-footer");
      this.homework.footer.feedback = document.querySelector(".hw-footer-feedback");
      this.homework.footer.btnSkip = document.querySelector(".hw-btn-skip");
      this.homework.footer.buttons = document.querySelector(".hw-feedback-buttons");
      this.homework.footer.btnControl = document.querySelector(".hw-btn-control");
   },
};

/**
 * Method: Events
 * Initializes event listeners
 */
export const Events = {
   init() {
      // start button
      Dom.viewStart.btnStart.addEventListener("click", () => Homework.load(lesson));

      // homework main
      Dom.homework.modal.addEventListener("click", (e) => Homework.handleClickEvent(e));

      // homework skip
      Dom.homework.footer.btnSkip.addEventListener("click", () => Homework.handleSkip());

      // homework control
      Dom.homework.footer.btnControl.addEventListener("click", () => Homework.control());
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

   if (Config.DEV_MODE) {
      window[Config.APP_NAME] = {};
      window[Config.APP_NAME].Dom = Dom;
      console.log("ℹ️ Dom =", window[Config.APP_NAME].Dom);

      Homework.load(lesson);
   }
};

document.addEventListener("DOMContentLoaded", () => init());
