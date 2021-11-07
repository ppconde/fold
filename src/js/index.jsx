import '../assets/scss/main.scss';
import React, {  useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Canvas } from '../js/scene/canvas';
import { SideMenuComponent } from './interface/side-menu/side-menu.component';
import { NavigationComponent } from './interface/navigation/navigation.component';

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
			<header className="header">
				<h1 className="title">Fold</h1>
				<NavigationComponent onClickLink={toggleSideMenu}/>
			</header>
			<SideMenuComponent type='settings' state={showSideMenu} />
			<canvas id="canvas"></canvas>
		</main>
	);
}

ReactDOM.render(<App/>, document.getElementById('root'));