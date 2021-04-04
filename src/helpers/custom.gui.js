import { GUI } from 'dat.gui';
import { ColorGUIHelper } from './color.gui.helper';
import { MinMaxGUIHelper } from './min.max.gui.helper';
import { DimensionGUIHelper } from './dim.gui.helper';

export class CustomGUI extends GUI {
  constructor(option) {
    super(option);
  }

  make(prop_name, obj, helpers) {

    // Name folder after object and attribute
    const obj_name = obj.constructor.name;
    const folder = this.addFolder(obj_name + ' ' + prop_name);

    switch (prop_name) {
      case 'position': {
        folder.add(obj.position, 'x', -10, 10).onChange(this.onChange.bind(null,helpers, obj));
        folder.add(obj.position, 'y', -10, 10).onChange(this.onChange.bind(null,helpers, obj));
        folder.add(obj.position, 'z', -10, 10).onChange(this.onChange.bind(null,helpers, obj));
        break;
      }
      case 'target': {
        folder.add(obj.target.position, 'x', -10, 10).onChange(this.onChange.bind(null,helpers, obj));
        folder.add(obj.target.position, 'y', -10, 10).onChange(this.onChange.bind(null,helpers, obj));
        folder.add(obj.target.position, 'z', -10, 10).onChange(this.onChange.bind(null,helpers, obj));
        break;
      }
      case 'color':
        folder.addColor(new ColorGUIHelper(obj, 'color', helpers), 'value').name('color');
        folder.add(obj, 'intensity', 0, 4, 0.01);
        break;

      case 'frostum':
        folder.add(new DimensionGUIHelper(obj, 'left', 'right'), 'value', 1, 100)
          .name('width')
          .onChange(this.onChange.bind(null,helpers, obj));
        folder.add(new DimensionGUIHelper(obj, 'bottom', 'top'), 'value', 1, 100)
          .name('height')
          .onChange(this.onChange.bind(null,helpers, obj));
        const minMaxGUIHelper = new MinMaxGUIHelper(obj, 'near', 'far', 0.1);
        folder.add(minMaxGUIHelper, 'min', 0.1, 50, 0.1).name('near').onChange(this.onChange.bind(null,helpers, obj));
        folder.add(minMaxGUIHelper, 'max', 0.1, 50, 0.1).name('far').onChange(this.onChange.bind(null,helpers, obj));
        folder.add(obj, 'zoom', 0.01, 1.5, 0.01).onChange(this.onChange.bind(null,helpers, obj));
        break;
    }

  }

  /**
   * Updates all objects passed as argument. Camera, lights and helpers
   * @param {*} helpers 
   * @param {*} obj 
   */
  onChange (helpers, obj) {
    helpers?.forEach((helper) => helper.update());
    obj.target.updateMatrixWorld && obj.target.updateMatrixWorld();
    obj.updateProjectionMatrix && obj.updateProjectionMatrix();
  }
}