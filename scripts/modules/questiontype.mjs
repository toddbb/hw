import * as Core from "../script.js";
import { Homework, Sheet } from "./homework.mjs";
import * as Utils from "./utils.mjs";

/*********************************************************************************/
/*****************                LOAD                ****************************/
/*********************************************************************************/

export const Load = {
   //
   //
   /******* Multiple Choice *******/
   multipleChoice(data) {
      // create container
      const container = createContainer(data);

      const responses = extractKeys("answer", data);
      let options = {
         classes: ["answer-item", "multiple-choice-item", "fit-text"],
         parent: container,
         attributes: {},
      };

      responses.forEach((answer, index) => {
         options.attributes["data-akey"] = `correct-${answer.correct}`;
         options.id = `answer-${String(index).padStart(2, "0")}`;
         options.textContent = answer.text;
         Utils._createElement("div", options);
      });
   },

   //
   //
   /***** Fill In Blanks  *****/
   fillBlanks(data) {
      // create container
      const container = createContainer(data);

      const responses = extractKeys("paragraph", data);

      // sub-container for each response item
      let options = {
         classes: ["answer-item", "fill-blanks-item", "fit-text"],
         parent: container,
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
               autocomplete: "off",
            },
         };
         let parsed = parseCurlyBraces(response.text);
         parsed.forEach((item, itemIndex) => {
            if (item.type === "text") {
               inlineOptions_text.textContent = item.value;
               Utils._createElement("p", inlineOptions_text);
            } else if (item.type === "braced") {
               inlineOptions_input.id = `input-${String(index).padStart(2, "0")}-${String(itemIndex).padStart(2, "0")}`;
               inlineOptions_input.attributes["data-akey"] = item.value;
               Utils._createElement("input", inlineOptions_input);
            }
         });
      });
   },

   //
   //
   /***** Order Items  *****/
   orderItems(data) {
      // create container
      const container = createContainer(data);

      const responses = extractKeys("item", data);
      console.log("Order Items Responses:", responses);

      let options = {
         classes: ["order-item", "fit-text"],
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

      Events.orderItems.init(container);
   },

   /***** Open Answer  *****/
   openAnswer(data) {
      // create container
      const container = createContainer(data);

      const responses = extractKeys("answer", data);

      let options = {
         classes: ["open-answers-item"],
         attributes: {
            type: "text",
            autocomplete: "off",
         },
      };

      let mediaTypes = ["text", "picture", "audio"];

      responses.forEach((response, index) => {
         // create subcontainer
         const subcontainer = Utils._createElement("div", {
            classes: ["open-answers-subcontainer", "flex-row", "gap-1"],
            id: `open-answers-subcontainer-${String(index).padStart(2, "0")}`,
            parent: container,
         });

         // add prepend text, picture, or audio
         const mediaType = getMediaType(response, ["text", "picture", "audio"]);
         let optionsPrepend = {
            classes: ["open-answers-prepend"],
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
         options.id = `open-answers-item-${String(index).padStart(2, "0")}`;
         options.attributes["data-akey"] = response.answers;
         options.parent = subcontainer;
         Utils._createElement("input", options);
      });

      /// unify the prepend widths
      unifyWidths(".open-answers-prepend");
   },
};
//
//
//
//
//
/*********************************************************************************/
/*****************                EVENTS              ****************************/
/*********************************************************************************/
export const Events = {
   /*****  Multiple Choice  *****/
   multipleChoice: {
      handler(e) {
         if (!e.target.classList.contains("multiple-choice-item")) return;
         // remove selected class from all items
         const items = e.target.parentNode.querySelectorAll(".multiple-choice-item");
         Utils._removeClass(items, "selected-blue");
         const item = e.target;
         Utils._addClass(item, "selected-blue");
      },
   },

   /*****  Order Items *****/
   orderItems: {
      container: null,
      draggedItem: null,
      lastAfter: null, // we'll overwrite in init

      init(container) {
         this.container = container;
         this.lastAfter = Symbol("start"); // ← a value that can never === null or a node

         container.addEventListener("dragstart", (e) => {
            if (e.target.classList.contains("order-item")) {
               this.draggedItem = e.target;
               e.target.classList.add("dragging");
            }
         });

         container.addEventListener("dragover", (e) => {
            e.preventDefault();
            const after = this.getDropTarget(e.clientX);

            // now only the *real* same‐target compares out
            if (after === this.lastAfter) return;

            this.lastAfter = after;

            if (!after) {
               // only append once, when crossing the last midpoint
               if (this.container.lastElementChild !== this.draggedItem) {
                  this.container.appendChild(this.draggedItem);
               }
            } else {
               if (after.previousElementSibling !== this.draggedItem) {
                  this.container.insertBefore(this.draggedItem, after);
               }
            }
         });

         container.addEventListener("dragend", () => {
            if (this.draggedItem) this.draggedItem.classList.remove("dragging");
            this.draggedItem = null;
            // reset for next drag
            this.lastAfter = Symbol("start");
         });
      },

      getDropTarget(x) {
         const items = [...this.container.querySelectorAll(".order-item:not(.dragging)")];
         return (
            items.find((item) => {
               const box = item.getBoundingClientRect();
               return x < box.left + box.width / 2;
            }) || null
         );
      },
   },
};

//
//
//

/*********************************************************************************/
/*****************              RESULTS               ****************************/
/*********************************************************************************/

export const Results = {
   multipleChoice: {
      check: () => {
         const selected = document.querySelector(".multiple-choice-item.selected-blue");
         if (!selected) {
            Homework.handleResult(false);
            return;
         }

         const isCorrect = selected.dataset.akey === "correct-yes";
         const correctElement = selected.parentNode.querySelector(".multiple-choice-item[data-akey='correct-yes']");
         Homework.handleResult(isCorrect, selected, correctElement);
      },
   },

   fillBlanks: {
      check: () => {
         // get all input elements
         const inputs = document.querySelectorAll(".fill-blanks-inputItem");
         // compare the input values with the correct answers in the dataset 'akey'
         let isCorrect = true;
         inputs.forEach((input) => {
            const akey = normalizeStringsToCompare(input.dataset.akey);
            const value = normalizeStringsToCompare(input.value);
            console.log(`Checking input: ${value} against key: ${akey}`);
            if (value !== akey) {
               isCorrect = false;
            }
         });
         Homework.handleResult(isCorrect);
      },
   },

   orderItems: {
      check: () => {
         // get the sheet data based on the current sheet index
         const sheetData = Sheet.data;
         // helper function
         const getItemOrderedValues = (obj) => {
            return Object.keys(obj)
               .filter((key) => key.startsWith("item "))
               .sort((a, b) => {
                  const numA = parseInt(a.split(" ")[1]);
                  const numB = parseInt(b.split(" ")[1]);
                  return numA - numB;
               })
               .map((key) => obj[key]); // Return the actual values instead of keys
         };

         // get the correct order from the sheet data and ordered values
         const correctOrder = getItemOrderedValues(sheetData);

         // compare that with the order of the items in the container
         // use 'text' if <div>, use 'image' if <img>, use 'audio' if <audio>
         const items = document.querySelectorAll(".order-item");
         const orderedValues = [...items].map((item) => {
            if (item.querySelector("img")) {
               return { type: "picture", value: item.querySelector("img").src };
            } else if (item.querySelector("audio")) {
               return { type: "audio", value: item.querySelector("audio").src };
            } else {
               return { type: "text", value: item.textContent.trim() };
            }
         });
         // compare the ordered values with the correct order
         let isCorrect = true;
         if (orderedValues.length !== correctOrder.length) {
            correct = false;
         } else {
            for (let i = 0; i < orderedValues.length; i++) {
               const orderedValue = normalizeStringsToCompare(orderedValues[i].value);
               const correctValue = normalizeStringsToCompare(correctOrder[i][orderedValues[i].type]);

               if (orderedValue !== correctValue) {
                  isCorrect = false;
                  break;
               }
            }
         }

         Homework.handleResult(isCorrect);
      },
   },

   openAnswers: {
      check: () => {
         // get all input elements
         const inputs = document.querySelectorAll(".open-answers-item");
         // compare the input values with the correct answers in the dataset 'akey'
         let isCorrect = true;
         inputs.forEach((input) => {
            console.log("Checking input:", input);
            const akey = normalizeStringsToCompare(input.dataset.akey);
            const value = normalizeStringsToCompare(input.value);
            console.log(`Checking input: ${value} against key: ${akey}`);
            if (value !== akey) {
               isCorrect = false;
            }
         });
         Homework.handleResult(isCorrect);
      },
   },
};

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

/// creates the container for each question type
function createContainer(data) {
   const questionType = data.info.type;

   return Utils._createElement("div", {
      classes: [`${questionType}-container`, "response-container", "flex-col"],
      attributes: {
         "data-qtype": questionType,
      },
      parent: Core.Dom.homework.main.response.container,
   });
}

/// gets the media from object of different key types (e.g. text, picture, audio)
export function getMediaType(data, mediaTypes) {
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

function unifyWidths(className) {
   const elements = document.querySelectorAll(className);
   if (elements.length === 0) return;

   // Get the maximum width
   let maxWidth = 0;
   elements.forEach((el) => {
      const width = el.offsetWidth;
      if (width > maxWidth) {
         maxWidth = width;
      }
   });

   // Set all elements to the maximum width
   elements.forEach((el) => {
      el.style.width = `${maxWidth}px`;
   });
}

function normalizeStringsToCompare(str) {
   // remove punctuation, convert to lowercase, and trim whitespace
   // add error handling if str is not a string
   if (typeof str !== "string") {
      console.error("normalizeStringsToCompare(): Input is not a string; str = ", str);
      return "";
   }
   return str
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
      .toLowerCase()
      .trim();
}
