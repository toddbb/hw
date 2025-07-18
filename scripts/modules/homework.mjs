import * as Main from "../script.js";
import { Get } from "./api.mjs";
import { Config } from "./config.mjs";

export const Homework = {
   /// Init and and show the homework for the first time
   async start() {
      Main.Views.show(Main.Dom.views.homework);
      const lessonInfo = await this.getHomeworkInfo();
   },

   /// **** GET THE HOMEWORK INFO  *****/
   async getHomeworkInfo(lesson) {
      try {
         return await this._getInfo(Config.DEV_LESSON);
      } catch (error) {
         console.error(`Homework.start() Error: ${error}`);
      }
   },

   /// ***** LOAD THE QUESTION DOM ************** ///
   async getLessonContent(lesson, extension = "", responseType = "json") {
      try {
         const lessonInfo = await this._getInfo(Config.DEV_LESSON);
         console.log(lessonInfo);
      } catch (error) {
         console.error(`Homework.start() Error: ${error}`);
      }
   },

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
   //
   //
   //
   //
   //
   //

   /// get /test/info.json; this comes from copying network object response in dev console
   async _getInfo(lesson) {
      try {
         let data = await Get(`${Config.API_URL}/homework/${lesson}/info.json`);
         return data;
      } catch (error) {
         console.error(`HW Error (Homework._getInfo): ${error}`);
      }
   },

   async _getContent(lesson, extension, responseType = "json") {
      try {
         let data = await Get(`${Config.API_URL}/homework/${lesson}/test/${extension}`, { responseType: responseType });
         return data;
      } catch (error) {
         console.error(`Homework._getContent Error: ${error}`);
      }
   },
};
