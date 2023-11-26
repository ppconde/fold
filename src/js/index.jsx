import '../assets/scss/main.scss';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Canvas } from '../js/scene/canvas';
import { SideMenuComponent } from './components/side-menu/side-menu.component';
import { HeaderComponent } from './components/header/header.component';
import { supabaseService } from './services/db-service';
import { cacheService } from './services/cache-service';
import { CACHE } from './constants/cache-constants';
import { ControlsComponent } from './components/controls/controls-component';

const App = () => {
	const [{ showSideMenu, menuType }, setShowSideMenu] = useState({ showSideMenu: false, menuType: '' });
	const [loading, setLoading] = useState(true);

	useEffect(init, []);

	return (
		<main className="main">
			<HeaderComponent activateSideMenu={activateSideMenu} />
			{renderSideMenu()}
			<canvas id="canvas"></canvas>
			<ControlsComponent />
		</main>
	);

	/**
	 * Initializes the application
	 */
	async function init() {
		const canvas = document.getElementById('canvas');
		new Canvas(canvas);
		addClickEventListener();

		const library = await supabaseService.getOrigamiLibrary();
		if (library.length) {
			cacheService.setItem(CACHE.ORIGAMI, library);
			setOrigamiImages(library);
		}
		setLoading(false);
	}

	/**
	 * Renders side menu component
	 */
	function renderSideMenu() {
		return showSideMenu ?
			<SideMenuComponent
				key={menuType}
				menuType={menuType}
				activateSideMenu={activateSideMenu}
				loading={loading}
			/> : null
	}

	/**
	 * Toggles side menu when there's a click inside the menu button
	 * @param {*} e 
	 */
	function activateSideMenu(e) {
		e.stopPropagation();
		setShowSideMenu({ showSideMenu: !!e.target.innerText || false, menuType: e.target.innerText.toLowerCase() });
	}

	/**
	 * Adds a click event listener when there's a click on top of side menu
	 */
	function addClickEventListener() {
		window.addEventListener('click', function (e) {
			const element = document.querySelector('.side-menu');
			const isClickedInsideSideMenu = element !== e.target && element?.contains(e.target);

			if (!isClickedInsideSideMenu) {
				setShowSideMenu({ showSideMenu: false });
			}
		});
	}

	/**
	 * Load origami images from supabase storage and sets them into cache
	 * @param library 
	 */
	function setOrigamiImages(library) {
		library.forEach(async (origami) => {
			const origameName = origami.name.toLowerCase();
			const img = await supabaseService.getOrigamiImage(origameName);
			cacheService.setItem(origameName, img);
		});
	}
}

ReactDOM.render(<App />, document.getElementById('root'));