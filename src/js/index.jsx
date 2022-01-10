import '../assets/scss/main.scss';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Canvas } from '../js/scene/canvas';
import { SideMenuComponent } from './components/side-menu/side-menu.component';
import { HeaderComponent } from './components/header/header.component';

const App = () => {
	const [{ showSideMenu, menuType }, setShowSideMenu] = useState({ showSideMenu: false, menuType: '' });

	useEffect(() => {
		const canvas = document.getElementById('canvas');
		new Canvas(canvas);
		addClickEventListener();
	}, () => removeClickEventListener());

	return (
		<main className="main">
			<HeaderComponent activateSideMenu={activateSideMenu} />
			<SideMenuComponent key={menuType} menuType={menuType} showSideMenu={showSideMenu} activateSideMenu={activateSideMenu} />
			<canvas id="canvas"></canvas>
		</main>
	);

	function activateSideMenu(e) {
		e.stopPropagation();
		setShowSideMenu({ showSideMenu: true, menuType: e.target.innerText.toLowerCase() });
	}

	function addClickEventListener() {
		window.addEventListener('click', function (e) {
			const element = document.querySelector('.side-menu');
			const isClickedInsideSideMenu = element !== e.target && element?.contains(e.target);

			if (!isClickedInsideSideMenu) {
				setShowSideMenu({ showSideMenu: false });
			}
		});
	}

	function removeClickEventListener() {
		window.removeEventListener('click');
	}
}

ReactDOM.render(<App />, document.getElementById('root'));