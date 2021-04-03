import { GUI } from 'dat.gui';


export class CustomGUI extends GUI {
  constructor(option) {
    super(option);
  }

  makeXYZGUI(gui, vector3, name, light, helper) {
    const folder = gui.addFolder(name);
    folder.add(vector3, 'x', -10, 10).onChange(this.onChangeHandler.bind(null, light, helper));
    folder.add(vector3, 'y', 0, 10).onChange(this.onChangeHandler.bind(null, light, helper));
    folder.add(vector3, 'z', -10, 10).onChange(this.onChangeHandler.bind(null, light, helper));
    folder.open();
  }

  onChangeHandler (light, helper) {
    light.target.updateMatrixWorld();
    helper.update();
  };
}