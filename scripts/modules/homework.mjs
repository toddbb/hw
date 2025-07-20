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

   /// Init Homework
   async load(lesson) {
      // get homework info & save in Homework vars
      this.lessonName = lesson;
      this.info = await this.getInfo(this.lessonName);
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

   handleSkip() {
      if (this.sheetIndex < this.totalSheets) {
         this.sheetIndex++;
         Sheet.load();
      }
   },

   handleClickEvent(e) {
      console.log("🖱️Homework click event: ", e.target);
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
      Utils._notVisible(Core.Dom.homework.main.container);
      this.data = Homework.info.sheets[Homework.sheetIndex];
      this.questionType = this.data.info.type;
      this.instruction = this.data.info.en;

      this.displayInstruction(Sheet.instruction);
      await Question.load();
      await Response.load(this.questionType);

      Utils._visible(Core.Dom.homework.main.container);

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
