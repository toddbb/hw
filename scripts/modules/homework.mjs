import * as Core from "../script.js";
import { Get } from "./api.mjs";
import { Config } from "./config.mjs";
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

   /// Init Homework
   async start(lesson) {
      this.lessonName = lesson;
      Core.Views.show(Core.Dom.views.homework);
      this.info = await this.getInfo(this.lessonName);
      this.resources = await this.loadResources(this.lessonName);

      // for debugging
      if (Config.DEV_MODE) {
         window[Config.APP_NAME].Homework = Homework;
         console.log("ℹ️ Homework =", window[Config.APP_NAME].Homework);
      }

      Sheet.load();
   },

   /// **** GET THE HOMEWORK INFO  *****/
   async getInfo(lesson) {
      try {
         return await Get(`${Config.API_URL}/content/lessons/${lesson}/test/info.json`);
      } catch (error) {
         console.error(`Homework.start() Error: ${error}`);
         return null;
      }
   },

   // *** Load Resources at start ****//
   async loadResources(lesson) {
      try {
         let resources = [];

         for (const resource of this.info.resources) {
            const blob = await this.getContent(lesson, resource, "blob");
            resources.push({
               blob: blob,
               name: resource,
            });
         }

         return resources;
      } catch (error) {
         console.error(`Homework.loadResources() Error: ${error}`);
         return [];
      }
   },

   /// ***** GET CONTENT ************** ///
   async getContent(lesson, file = "", responseType = "json") {
      try {
         return await Get(`${Config.API_URL}/content/lessons/${lesson}/test/${file}`, { responseType, ignore404: true });
      } catch (error) {
         // Log and handle other errors
         console.error(`Homework.getContent() Error:`, error);
         return null;
      }
   },
};

/**
 * Method: Sheets
 * Method for homework sheets
 */
export const Sheet = {
   data: null, // sheet data from info.json
   questionType: null,
   instruction: null,
   questionText: null,
   questionBody: null,
   source: null,

   load() {
      this.data = Homework.info.sheets[Homework.sheetIndex];
      this.questionType = this.data.info.type;
      this.instruction = this.data.info.en;

      // for debugging
      if (Config.DEV_MODE) {
         window[Config.APP_NAME].Sheet = Sheet;
         console.log("ℹ️ Sheets =", window[Config.APP_NAME].Sheet);
      }

      Question.load();
      Response.load(this.questionType);
   },
};

/**
 * Method: Question
 * Builds and controls the question section of the homework
 */
export const Question = {
   load() {
      this.displayInstruction(Sheet.instruction);
      this.displayQuestionText(Sheet.data.question.text);
      this.displayQuestionBody(Sheet.data.question);
   },

   displayInstruction(instruction) {
      if (!instruction) {
         Utils._hide(Core.Dom.homework.main.question.instruction);
      } else {
         Core.Dom.homework.main.question.instruction.textContent = instruction;
         Utils._show(Core.Dom.homework.main.question.instruction);
      }
   },

   displayQuestionText(text) {
      if (!text || text.length === 0) {
         Utils._hide(Core.Dom.homework.main.question.text);
      } else {
         Core.Dom.homework.main.question.text.textContent = text;
         Utils._show(Core.Dom.homework.main.question.text);
      }
   },

   displayQuestionBody(question) {
      const mediaTypes = ["picture", "audio", "pdf"];
      let filename;

      for (const type of mediaTypes) {
         if (question[type] && question[type].trim() !== "") {
            filename = question[type]; // return filename of the first non-empty media type
         }
      }

      // get blob from resources
      const blob = Homework.resources.filter((resource) => resource.name === filename)[0].blob;

      const type = blob.type;

      // Clean up any previous content
      const container = Core.Dom.homework.main.question.body;
      container.innerHTML = "";

      // Create an object URL
      const url = URL.createObjectURL(blob);

      if (type === "application/pdf") {
         // Embed the PDF
         const iframe = document.createElement("iframe");
         iframe.src = `${url}#toolbar=0&navpanes=0&scrollbar=0`;
         iframe.width = "100%";
         iframe.height = "480px";
         iframe.frameborder = "0";
         iframe.style.border = "none";
         container.appendChild(iframe);
      } else if (type.startsWith("image/")) {
         // Display image
         const img = document.createElement("img");
         img.src = url;
         img.alt = "Image preview";
         img.style.maxWidth = "100%";
         container.appendChild(img);
      } else if (type.startsWith("audio/")) {
         // Play audio
         const audio = document.createElement("audio");
         audio.src = url;
         audio.controls = true;
         container.appendChild(audio);
      } else {
         container.textContent = "Unsupported file type.";
      }
   },
};

/**
 * Method: Response
 * The Response section of homework
 */
export const Response = {
   questionTypeHandlers: {
      "multiple-choice": handleMultipleChoice,
      "fill-blanks": handleFillBlanks,
      "order-items": handleOrderItems,
   },

   load(type) {
      console.log(type);
      const handler = this.questionTypeHandlers[type];

      if (handler) {
         handler(Sheet.data);
      } else {
         console.warn(`No handler defined for question type: "${type}"`);
      }
   },
};

/*************   Question Type Functions (LOADING) ***************************/
function handleMultipleChoice(data) {
   /// get all answers
   let vals = Object.values(data);
   let keys = Object.keys(data);

   let answers = [];

   for (const key in data) {
      if (key.includes("answer")) {
         answers.push(data[key]);
      }
   }

   answers.forEach((answer, index) => {
      console.log("creating answer for", answer);
      Utils._createElement("div", {
         classes: ["answer-item", `correct-${answer.correct}`],
         id: `answer${index}`,
         textContent: answer.text,
         parent: Core.Dom.homework.main.response.container,
      });
   });
}

function handleFillBlanks(data) {}

function handleOrderItems(data) {}
