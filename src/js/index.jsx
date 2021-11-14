import '../assets/scss/main.scss';
import React, {  useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Canvas } from '../js/scene/canvas';
import { SideMenuComponent } from './interface/side-menu/side-menu.component';
import { HeaderComponent } from './interface/header/header.component';

const App = () => {
	const [showSideMenu, setShowSideMenu] = useState(false);
	const toggleSideMenu = (e) => {
		console.log('eee: ', e);
		e.stopPropagation();
		setShowSideMenu(!showSideMenu);
	}
	useEffect(() => {
		const canvas = document.getElementById('canvas');
		new Canvas(canvas);
	});

	return (
		<main className="main">
			<HeaderComponent toggleSideMenu={toggleSideMenu} />
			<SideMenuComponent type='settings' showSideMenu={showSideMenu} />
			<canvas id="canvas"></canvas>
		</main>
	);
}

ReactDOM.render(<App/>, document.getElementById('root'));