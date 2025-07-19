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
   sheetIndex: 6,

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
            const blob = await Get(`${Config.API_URL}/content/lessons/${lesson}/test/${resource}`, { responseType: "blob", ignore404: true });
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

   handleClickEvent(e) {
      console.log("🖱️Homework click event: ", e.target);
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

      filename = getMediaType(question, mediaTypes).value;

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
   questionTypeLoaders: {
      "multiple-choice": loadMultipleChoice,
      "fill-blanks": loadFillBlanks,
      "order-items": loadOrderItems,
      "open-answers": loadOpenAnswer,
   },

   load(type) {
      const load = this.questionTypeLoaders[type];
      if (load) {
         load(Sheet.data);
      } else {
         console.warn(`No handler defined for question type: "${type}"`);
      }
   },
};

/*****************************************************************************/
/*************      Question Type Functions (LOAD) ***************************/
/*****************************************************************************/

//
//
/***** Question Type: Multiple Choice  *****/
function loadMultipleChoice(data) {
   const responses = extractKeys("answer", data);
   let options = {
      classes: ["answer-item", "multiple-choice-item", "fit-text"],
      parent: Core.Dom.homework.main.response.container,
   };

   responses.forEach((answer, index) => {
      options.classes.push(`correct-${answer.correct}`);
      options.id = `answer-${String(index).padStart(2, "0")}`;
      options.textContent = answer.text;
      Utils._createElement("div", options);
   });
}

//
//
/***** Question Type: Fill In Blanks  *****/
function loadFillBlanks(data) {
   const responses = extractKeys("paragraph", data);
   let options = {
      classes: ["answer-item", "fill-blanks-item", "fit-text", "flex-row", "flex-wrap", "gap-2"],
      parent: Core.Dom.homework.main.response.container,
   };

   responses.forEach((response, index) => {
      options.id = `paragraph-${String(index).padStart(2, "0")}`;
      let responseContainer = Utils._createElement("div", options);

      // create inline elements for each response
      let inlineOptions_text = {
         classes: ["fill-blanks-textItem"],
         parent: responseContainer,
      };
      let inlineOptions_input = {
         classes: ["fill-blanks-inputItem"],
         parent: responseContainer,
         attributes: {
            type: "input",
         },
      };
      let parsed = parseCurlyBraces(response.text);
      parsed.forEach((item, itemIndex) => {
         if (item.type === "text") {
            inlineOptions_text.textContent = item.value;
            Utils._createElement("p", inlineOptions_text);
         } else if (item.type === "braced") {
            inlineOptions_input.id = `input-${String(index).padStart(2, "0")}-${String(itemIndex).padStart(2, "0")}`;
            inlineOptions_input.attributes["data-a"] = item.value;
            console.log(inlineOptions_input);
            Utils._createElement("input", inlineOptions_input);
         }
      });
   });
}

//
//
/***** Question Type: Order Items  *****/
function loadOrderItems(data) {
   // create container
   const container = Utils._createElement("div", {
      classes: ["order-items-container", "fit-text", "flex-row", "flex-wrap", "gap-3"],
      parent: Core.Dom.homework.main.response.container,
   });

   const responses = extractKeys("item", data);
   let options = {
      classes: ["order-item", "fit-text", "flex-row", "flex-wrap", "gap-3"],
      attributes: {
         draggable: true,
      },
      parent: container,
   };

   const mediaTypes = ["text", "picture", "audio"];

   let responsesShuffled = Utils._shuffleArray(responses);

   responsesShuffled.forEach((response, index) => {
      options.id = `order-item-${String(index).padStart(2, "0")}`;
      const mediaType = getMediaType(response, ["text", "picture", "audio"]);

      switch (mediaType.type) {
         case "text":
            options.textContent = response.text;
            break;

         case "picture":
            options.innerHTML = `<img src=${response.picture} />`;
            break;

         case "audio":
            options.innerHTML = `controls="" controlslist="nodownload noplaybackrate" data-uid="audio" style="width: 100%; min-width: 128px; display: none;" audio-player-plain=""`;
            break;

         default:
            throw new Error("loadOrderItems(): no supported media type");
      }

      Utils._createElement("div", options);
   });
}

//
//
/***** Question Type: Open Answer  *****/
function loadOpenAnswer(data) {
   // create container
   const container = Utils._createElement("div", {
      classes: ["open-answer-container", "fit-text", "flex-col", "flex-wrap", "gap-3", "h-full", "justify-evenly"],
      parent: Core.Dom.homework.main.response.container,
   });

   const responses = extractKeys("answer", data);

   let options = {
      classes: ["open-answer-item"],
      attributes: {
         type: "text",
      },
   };

   let mediaTypes = ["text", "picture", "audio"];

   responses.forEach((response, index) => {
      // create subcontainer
      const subcontainer = Utils._createElement("div", {
         classes: ["open-answer-subcontainer", "flex-row", "gap-1"],
         id: `open-answer-subcontainer-${String(index).padStart(2, "0")}`,
         parent: container,
      });

      // add prepend text, picture, or audio
      const mediaType = getMediaType(response, ["text", "picture", "audio"]);
      let optionsPrepend = {
         classes: ["open-answer-prepend"],
         parent: subcontainer,
      };

      switch (mediaType.type) {
         case "text":
            optionsPrepend.textContent = response.text;
            break;

         case "picture":
            optionsPrepend.innerHTML = `<img src=${response.picture} />`;
            break;

         case "audio":
            optionsPrepend.innerHTML = `controls="" controlslist="nodownload noplaybackrate" data-uid="audio" style="width: 100%; min-width: 128px; display: none;" audio-player-plain=""`;
            break;

         default:
            throw new Error("loadOrderItems(): no supported media type");
      }

      Utils._createElement("div", optionsPrepend);

      // add text input
      options.id = `open-answer-item-${String(index).padStart(2, "0")}`;
      options.attributes["data-a"] = response.answers;
      options.parent = subcontainer;
      Utils._createElement("input", options);
   });
}

//
//
//
//
//
//
//
//
//
//
//
//
//
//
/*****************************************************************************/
/*************            HELPER FUNCTIONS               *********************/
/*****************************************************************************/

/// gets the media from object of differen types
function getMediaType(data, mediaTypes) {
   let mediaType;

   for (const type of mediaTypes) {
      if (data[type] && data[type].trim() !== "") {
         mediaType = {
            type: type,
            value: data[type],
         };
      }
   }

   return mediaType;
}
/// extract specific keys from an object
function extractKeys(keyName, data) {
   let responses = [];
   for (const key in data) {
      if (key.includes(keyName)) {
         responses.push(data[key]);
      }
   }
   return responses;
}

/// parse text with curly braces
function parseCurlyBraces(text) {
   return [...text.matchAll(/([^{]+)|{(.*?)}/g)].map((match) => {
      if (match[2] !== undefined) {
         return { type: "braced", value: match[2] }; // inside {}
      } else {
         return { type: "text", value: match[1].trim() }; // outside {}
      }
   });
}

/// extract specific keys from an object
function fitTextToContainer(container, minFontSize = 0.4, maxFontSize = 2) {
   const textElement = container.querySelector(".fit-text");
   if (!textElement) return;

   textElement.style.fontSize = `${maxFontSize}rem`;

   const containerWidth = container.clientWidth;
   const containerHeight = container.clientHeight;

   let fontSize = maxFontSize;

   while (fontSize > minFontSize) {
      const { scrollWidth, scrollHeight } = textElement;

      if (scrollWidth <= containerWidth && scrollHeight <= containerHeight) {
         break;
      }

      fontSize -= 0.02;
      textElement.style.fontSize = `${fontSize}rem`;
   }
}
