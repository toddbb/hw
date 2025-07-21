import * as Core from "../script.js";
import { Get } from "./api.mjs";
import { Config } from "./config.mjs";
import { Media } from "./media.mjs";
import * as QuestionType from "./questiontype.mjs";
import * as Utils from "./utils.mjs";

/**
 * Method: Homework
 * Main method for controlling homework
 */
export const Homework = {
   lessonName: null,
   info: {},
   resources: [],
   sheetIndex: 0,
   totalSheets: null,
   btnControl: {
      state: "check",
      active: false,
   },
   disableResponseEvents: false,

   /// Init Homework
   async load(lesson) {
      // get homework info & save in Homework vars
      this.lessonName = lesson;
      this.info = await this.getInfo(this.lessonName);
      this.sheetIndex = Config.DEV_MODE ? Config.DefaultSheetNum : this.sheetIndex;
      this.totalSheets = this.info.sheets.length;

      // load media resources
      this.resources = await Media.loadResources(this.info.resources, `lessons/${this.lessonName}/test`);

      // load hw view & load sheet
      Sheet.load();
      Core.Views.show(Core.Dom.views.homework);

      // for debugging
      if (Config.DEV_MODE) {
         window[Config.APP_NAME].Homework = Homework;
         console.log("ℹ️ Homework =", window[Config.APP_NAME].Homework);
      }
   },

   /// Get Homework Info from test folder
   async getInfo(lesson) {
      try {
         return await Get(`${Config.API_URL}/content/lessons/${lesson}/test/info.json`);
      } catch (error) {
         console.error(`Homework.load() Error: ${error}`);
         return null;
      }
   },

   handleResult(isCorrect) {
      Homework.disableResponseEvents = true;
      if (isCorrect) {
         Footer.setCorrect();
      } else {
         Footer.setIncorrect();
      }
   },

   handleEnd() {
      // Reset the homework state
      this.sheetIndex = 0;
      this.totalSheets = null;
      this.resources = [];
      this.info = {};
      this.lessonName = null;

      // Reset the footer and header
      Footer.reset();
      Header.updateProgress();

      // Hide the homework view
      Utils._hide(Core.Dom.views.homework);
      // Show the main view
      Utils._show(Core.Dom.views.main);
      // Optionally, you can also reset the modal if it was used
      Utils._hide(Core.Dom.homework.modal);
   },
};

/**
 * Method: Sheets
 * Method for homework sheets
 */
export const Sheet = {
   data: null,
   questionType: null,
   instruction: null,

   async load() {
      Footer.reset();
      Utils._notVisible(Core.Dom.homework.main.container);
      this.data = Homework.info.sheets[Homework.sheetIndex];
      this.questionType = this.data.info.type;
      this.instruction = this.data.info.en;

      this.displayInstruction(Sheet.instruction);
      await Question.load();
      await Response.load(this.questionType);

      Utils._visible(Core.Dom.homework.main.container);

      Header.updateProgress();

      Homework.disableResponseEvents = false;

      // for debugging
      if (Config.DEV_MODE) {
         window[Config.APP_NAME].Sheet = Sheet;
         console.log("ℹ️ Sheets =", window[Config.APP_NAME].Sheet);
      }
   },

   displayInstruction(instruction) {
      if (!instruction) {
         Utils._hide(Core.Dom.homework.main.instruction);
      } else {
         Core.Dom.homework.main.instruction.textContent = instruction;
         Utils._show(Core.Dom.homework.main.instruction);
      }
   },

   next() {
      if (Homework.sheetIndex < Homework.totalSheets - 1) {
         Homework.sheetIndex++;
         this.load();
      } else {
         console.log("End of homework reached.");
      }
   },
};

/**
 * Method: Question
 * Builds and controls the question section of the homework
 */
export const Question = {
   async load() {
      await this.displayQuestionBody(Sheet.data.question);
   },

   async displayQuestionBody(question) {
      // Clean up any previous content
      this.clear();

      const mediaTypes = ["picture", "audio", "pdf"];
      let filename;

      filename = QuestionType.getMediaType(question, mediaTypes).value;

      // get blob from resources
      const blob = Homework.resources.filter((resource) => resource.name === filename)[0].blob;

      // Create and add element, depending on blob.type
      const element = await Media.createElement(blob, { convertPDFtoImg: true });
      Core.Dom.homework.main.question.body.append(element);
   },

   clear() {
      const container = Core.Dom.homework.main.question.body;
      container.innerHTML = "";
   },
};

/**
 * Method: Response
 * The Response section of homework
 */
export const Response = {
   questionTypeLoaders: {
      "multiple-choice": QuestionType.Load.multipleChoice,
      "fill-blanks": QuestionType.Load.fillBlanks,
      "order-items": QuestionType.Load.orderItems,
      "open-answers": QuestionType.Load.openAnswer,
   },

   async load(type) {
      // clear any previous content
      this.clear();

      this.displayQuestionText(Sheet.data.question.text);
      const load = this.questionTypeLoaders[type];

      if (load) {
         load(Sheet.data);
      } else {
         console.warn(`No handler defined for question type: "${type}"`);
      }
   },

   displayQuestionText(text) {
      if (!text || text.length === 0) {
         Utils._hide(Core.Dom.homework.main.response.text);
      } else {
         Core.Dom.homework.main.response.text.textContent = text;
         Utils._show(Core.Dom.homework.main.response.text);
      }
   },

   clear() {
      this.displayQuestionText("");
      const container = Core.Dom.homework.main.response.container;
      // Keep the first child (response.text), remove the rest
      while (container.children.length > 1) {
         container.removeChild(container.lastChild);
      }
   },
};

//
//
/**
 * Method: Heaader
 * Controls the Header section of homework
 */
export const Header = {
   // Method: progress indicator
   renderProgress() {
      const container = Core.Dom.homework.header.progressBar.container;
      container.innerHTML = "";

      const progressBar = document.createElement("div");
      progressBar.className = "progress-bar";

      const completed = Homework.sheetIndex + 1;
      const total = Homework.totalSheets || 1;
      const percent = Math.round((completed / total) * 100);

      const fill = document.createElement("div");
      fill.className = "progress-fill";
      fill.style.width = `${percent}%`;
      fill.style.height = "100%";
      fill.style.background = "#4caf50";
      fill.style.transition = "width 0.3s";

      progressBar.appendChild(fill);

      const counter = document.createElement("span");
      counter.className = "progress-counter";
      counter.textContent = `${completed} / ${total}`;
      counter.style.marginLeft = "12px";
      counter.style.fontWeight = "bold";
      counter.style.fontSize = "14px";
      counter.style.verticalAlign = "middle";

      const wrapper = document.createElement("div");
      wrapper.style.display = "flex";
      wrapper.style.alignItems = "center";
      wrapper.appendChild(progressBar);
      wrapper.appendChild(counter);

      container.appendChild(wrapper);
   },

   updateProgress() {
      this.renderProgress();
   },
};

//
//
/**
 * Method: Footer
 * Controls the footer section of homework
 */
export const Footer = {
   setCorrect() {
      // add class to entire footer
      Core.Dom.homework.footer.container.classList.add("correct");
      // set feedback text and icon
      Core.Dom.homework.footer.feedbackText.textContent = "Correct!";
      Utils._addClass(Core.Dom.homework.footer.feedbackText, "correct");
      Utils._show(Core.Dom.homework.footer.feedbackIconTrophy);
   },
   setIncorrect() {
      // add class to entire footer
      Core.Dom.homework.footer.container.classList.add("incorrect");
      // set feedback text and icon
      Core.Dom.homework.footer.feedbackText.textContent = "Incorrect. Try again later.";
      Utils._addClass(Core.Dom.homework.footer.feedbackText, "incorrect");
      Utils._show(Core.Dom.homework.footer.feedbackIconThumbsUp);
   },
   reset() {
      // remove all classes from footer
      Core.Dom.homework.footer.container.classList.remove("correct", "incorrect");
      // change control button back to "Check"
      const btnControl = Core.Dom.homework.footer.btnControl;
      btnControl.classList.remove("mode-next");
      btnControl.classList.add("mode-check");
      btnControl.textContent = "Check";
      // reset feedback text and icons
      Core.Dom.homework.footer.feedbackText.textContent = "";
      Utils._hide(Core.Dom.homework.footer.feedbackIconTrophy);
      Utils._hide(Core.Dom.homework.footer.feedbackIconThumbsUp);
   },
   setControlMode(mode = "check") {
      const btnControl = Core.Dom.homework.footer.btnControl;
      if (mode === "next") {
         btnControl.classList.remove("mode-check");
         btnControl.classList.add("mode-next");
         btnControl.textContent = "Next";
      } else {
         btnControl.classList.remove("mode-next");
         btnControl.classList.add("mode-check");
         btnControl.textContent = "Check";
      }
   },
};

//
//
/**
 * Method: Handlers
 * Handles various events and actions in the homework module
 */
export const Handlers = {
   handleSkipClick() {
      Sheet.next();
   },

   /// "Check" or "Next" button click handler
   handleControlClick(e) {
      // get the state of the button
      const btn = Core.Dom.homework.footer.btnControl;
      const isModeCheck = btn.classList.contains("mode-check");
      const isModeNext = btn.classList.contains("mode-next");
      const isActive = btn.classList.contains("active");

      // if isModeCheck, check Results
      if (isModeCheck && isActive) {
         // get the type of question
         const questionType = Sheet.questionType;
         if (!questionType) {
            console.warn("No question type found in Sheet.questionType.");
            return;
         }

         // handle click based on question type using a handler
         const handlerLookup = {
            "multiple-choice": QuestionType.Results.multipleChoice.check,
            "fill-blanks": QuestionType.Results.fillBlanks.check,
            "order-items": QuestionType.Results.orderItems.check,
            "open-answers": QuestionType.Results.openAnswers.check,
         };
         const handler = handlerLookup[questionType];
         if (handler && typeof handler === "function") {
            handler(e);
         }

         // set the button to "Next" mode
         btn.classList.remove("mode-check");
         btn.classList.add("mode-next");
         btn.textContent = "Next";
         btn.classList.add("active");
      } else if (isModeNext) {
         // if not, reset btn and go to next sheet
         btn.classList.remove("mode-next");
         btn.classList.add("mode-check");
         btn.textContent = "Check";
         Footer.reset();
         Sheet.next();
      }
   },

   handleClickEvent(e) {
      if (Homework.disableResponseEvents) return;
      console.log("🖱️Homework click event: ", e.target);

      // get the response container
      const responseContainer = e.target.closest(".response-container");

      if (!responseContainer || !Core.Dom.homework.modal.contains(responseContainer)) {
         console.warn("Click event not in response container.");
         return;
      }

      // get the type of question
      const questionType = responseContainer.dataset.qtype;
      if (!questionType) {
         console.warn("No question type found in response container.");
         return;
      }

      // handle click based on question type using a handler
      const handlerLookup = {
         "multiple-choice": QuestionType.Events.multipleChoice.handler,
      };
      const handler = handlerLookup[questionType];
      if (handler && typeof handler === "function") {
         handler(e);
      }
   },
};
