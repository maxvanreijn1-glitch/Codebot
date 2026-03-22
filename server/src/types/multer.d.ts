declare module 'multer' {
  import { RequestHandler } from 'express';
  function multer(options?: any): any;
  namespace multer {
    function diskStorage(options: any): any;
    function memoryStorage(): any;
  }
  export = multer;
}
