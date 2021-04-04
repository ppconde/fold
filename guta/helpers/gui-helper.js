export class ColorGUIHelper {
    constructor(object, prop, helpers) {
      this.object = object;
      this.prop = prop;
      this.helpers = helpers;
    }
    get value() {
      return `#${this.object[this.prop].getHexString()}`;
    }
    set value(hexString) {
      this.object[this.prop].set(hexString);
      // Update helpers
      if (this.helpers !== undefined){
        for (const helper of this.helpers){
          helper.update();
        }
      }
    }
  }