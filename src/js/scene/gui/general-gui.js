import { GUIConfig } from './gui-config';
import { ColorGUIHelper } from './color-gui-helper';
import { MinMaxGUIHelper } from './min-max-gui-helper';
import { DimensionGUIHelper } from './dim-gui-helper';
import * as dat from 'dat.gui';

export class GeneralGUI {
	constructor(scene, sceneObjects) {
		this.scene = scene;
		this.sceneObjects = sceneObjects;
		//this.gui = new GUI;
		this.gui = new dat.GUI();
		this.setGUI();
	}

	/**
	 * Creates light objects and adds it to lightsMap, according to the lights configuration file
	 */
	setGUI = () => {
		this.guiDroplistMap = new Map();
		GUIConfig.forEach((droplist) => {
			if (droplist.enabled) {
				//let folder;
				let folder = this.gui.addFolder(droplist.key)
				// let sceneObj = this.sceneObjects[0].lightsMap.get(droplist.key);
				// let sceneHelpers = this.sceneObjects[2].helpersMap.get(droplist.key); // NOT SURE
				let sceneObj = this.sceneObjects.get('GeneralLights').lightsMap.get(droplist.key);
				let sceneHelpers = this.sceneObjects.get('GeneralHelpers').helpersMap.get(droplist.key); // NOT SURE
				Object.entries(droplist.props).forEach(([prop, val]) => {
					switch (prop) {
					case 'position':
						// folder = this.gui.addFolder(droplist.key.concat(' position'))
						folder.add(sceneObj.position, 'x', val.xmin, val.xmax).onChange(this.onChange.bind(null, sceneHelpers, sceneObj));
						folder.add(sceneObj.position, 'y', val.ymin, val.ymax).onChange(this.onChange.bind(null, sceneHelpers, sceneObj));
						folder.add(sceneObj.position, 'z', val.zmin, val.zmax).onChange(this.onChange.bind(null, sceneHelpers, sceneObj));
						break;
					case 'target':
						// folder = this.gui.addFolder(droplist.key.concat(' target'))
						folder.add(sceneObj.target.position, 'x', val.xmin, val.xmax).onChange(this.onChange.bind(null, sceneHelpers, sceneObj));
						folder.add(sceneObj.target.position, 'y', val.ymin, val.ymax).onChange(this.onChange.bind(null, sceneHelpers, sceneObj));
						folder.add(sceneObj.target.position, 'z', val.zmin, val.zmax).onChange(this.onChange.bind(null, sceneHelpers, sceneObj));
						break;
					case 'color':
						// folder = this.gui.addFolder(droplist.key.concat(' color'))
						folder.addColor(new ColorGUIHelper(sceneObj, 'color', sceneHelpers), 'value').name('color');
						folder.add(sceneObj, 'intensity', val.intensity.min, val.intensity.max, val.intensity.step);
						break;
					case 'frostum':
						
						//folder = this.gui.addFolder(droplist.key.concat(' shadows'))
						sceneObj = sceneObj.shadow.camera;
						folder.add(new DimensionGUIHelper(sceneObj, 'left', 'right'), 'value', 1, 100).name('width').onChange(this.onChange.bind(null, sceneHelpers, sceneObj));
						folder.add(new DimensionGUIHelper(sceneObj, 'bottom', 'top'), 'value', 1, 100).name('height').onChange(this.onChange.bind(null, sceneHelpers, sceneObj));
						const minMaxGUIHelper = new MinMaxGUIHelper(sceneObj, 'near', 'far', 0.1);
						folder.add(minMaxGUIHelper, 'min', val.near.min, val.near.max, val.near.mindif).name('near').onChange(this.onChange.bind(null, sceneHelpers, sceneObj));
						folder.add(minMaxGUIHelper, 'max', val.far.min, val.far.max, val.far.mindif).name('far').onChange(this.onChange.bind(null, sceneHelpers, sceneObj));
						folder.add(sceneObj, 'zoom', val.zoom.min, val.zoom.max, val.zoom.mindif).onChange(this.onChange.bind(null, sceneHelpers, sceneObj));
						break;
					}
				});
			}
		})
	}

	onChange(helpers, obj) {
		helpers?.forEach((helper) => helper.update());
		obj.target?.updateMatrixWorld && obj.target.updateMatrixWorld();
		obj.updateProjectionMatrix && obj.updateProjectionMatrix();
	}

	update = () => {
		// Do something
	}

}
