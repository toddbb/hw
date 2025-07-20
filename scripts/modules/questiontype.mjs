import * as Core from "../script.js";
import * as Utils from "./utils.mjs";

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
      };

      responses.forEach((answer, index) => {
         options.classes.push(`correct-${answer.correct}`);
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
               inlineOptions_input.attributes["data-a"] = item.value;
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
         classes: ["open-answer-item"],
         attributes: {
            type: "text",
            autocomplete: "off",
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
   },
};

export const Events = {
   // *** Order Items *** //
   orderItems: {
      container: null,
      draggedItem: null,
      insertPosition: null,

      init(container) {
         this.container = container;

         // Dragstart event
         container.addEventListener("dragstart", (e) => {
            if (e.target.classList.contains("order-item")) {
               Events.orderItems.draggedItem = e.target;
               e.target.classList.add("dragging");
               e.dataTransfer.effectAllowed = "move";
            }
         });

         // Dragend event
         container.addEventListener("dragend", (e) => {
            if (e.target.classList.contains("order-item")) {
               e.target.classList.remove("dragging");
               Events.orderItems.draggedItem = null;
               Events.orderItems.insertPosition = null;
            }
         });

         // Dragover event - Only determine position, don't move yet
         container.addEventListener("dragover", (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";

            if (Events.orderItems.draggedItem) {
               // Just store where we would insert, don't actually move
               Events.orderItems.insertPosition = Events.orderItems.getDragAfterElement(container, e.clientY);
            }
         });

         // Drop event - Actually perform the reordering
         container.addEventListener("drop", (e) => {
            e.preventDefault();

            if (Events.orderItems.draggedItem) {
               const afterElement = Events.orderItems.getDragAfterElement(container, e.clientY);
               if (!afterElement) {
                  // Append to end
                  container.appendChild(Events.orderItems.draggedItem);
               } else {
                  // Insert before the target element
                  container.insertBefore(Events.orderItems.draggedItem, afterElement);
               }
            }
         });
      },

      getDragAfterElement(container, y) {
         const draggableElements = [...container.querySelectorAll(".order-item:not(.dragging)")];

         let closest = null;
         let closestOffset = Number.POSITIVE_INFINITY;

         draggableElements.forEach((child) => {
            const box = child.getBoundingClientRect();
            const offset = y - (box.top + box.height / 2);
            if (offset < 0 && Math.abs(offset) < closestOffset) {
               closestOffset = Math.abs(offset);
               closest = child;
            }
         });

         return closest;
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
         "data-qt": questionType,
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
