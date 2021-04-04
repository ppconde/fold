import { GUI } from 'dat.gui';
import { ColorGUIHelper } from './color.gui.helper';


export class CustomGUI extends GUI {
  constructor(option) {
    super(option);
  }

  make(prop_name, obj, helpers) {

    // Name folder after object and attribute
    const obj_name = obj.constructor.name;
    const folder = this.addFolder(obj_name + ' ' + prop_name);
    console.log(helpers)

    switch (prop_name) {
      case 'position': {
        // Update helpers
        const onChange = () => helpers?.forEach((helper=> helper.update()));
        folder.add(obj.position, 'x', -10, 10).onChange(onChange);
        folder.add(obj.position, 'y', -10, 10).onChange(onChange);
        folder.add(obj.position, 'z', -10, 10).onChange(onChange);
        break;
      }
      case 'target': {
        // Update helpers and MatrixWorld
        const onChange = () =>{helpers?.forEach((helper=> helper.update())); obj.target.updateMatrixWorld();};
        folder.add(obj.target.position, 'x', -10, 10).onChange(onChange);
        folder.add(obj.target.position, 'y', -10, 10).onChange(onChange);
        folder.add(obj.target.position, 'z', -10, 10).onChange(onChange);
        break;
      }
      case 'color':
        folder.addColor(new ColorGUIHelper(obj, 'color', helpers), 'value').name('color');
        folder.add(obj, 'intensity', 0, 4, 0.01);
        break;

      case 'frostum':

        
        break;
    }

  }
}