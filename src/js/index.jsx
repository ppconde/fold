import '../assets/scss/main.scss';
import React, {  useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Canvas } from '../js/scene/canvas';
import { SideMenuComponent } from './components/side-menu/side-menu.component';
import { HeaderComponent } from './components/header/header.component';

const App = () => {
	const [{ showSideMenu, menuType }, setShowSideMenu] = useState({ showSideMenu: false, menuType: 'library' });
	const toggleSideMenu = (e) => {
		console.log('eee: ', e.target.innerText);
		e.stopPropagation();
		setShowSideMenu({ showSideMenu: !showSideMenu, menuType: e.target.innerText.toLowerCase() });
	}
	useEffect(() => {
		const canvas = document.getElementById('canvas');
		new Canvas(canvas);
	});

	return (
		<main className="main">
			<HeaderComponent toggleSideMenu={toggleSideMenu} />
			<SideMenuComponent type='settings' menuType={menuType} showSideMenu={showSideMenu} toggleSideMenu={toggleSideMenu} />
			<SideMenuComponent type='library' menuType={menuType} showSideMenu={showSideMenu} toggleSideMenu={toggleSideMenu} />
			<canvas id="canvas"></canvas>
		</main>
	);
}

ReactDOM.render(<App/>, document.getElementById('root'));