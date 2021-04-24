import '../assets/scss/main.scss';
import React, {  useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Canvas } from '../js/threejs/canvas';
import { NavigationComponent } from './components/navigation/navigation';

const App = () => {
	useEffect(() => {
		const canvas = document.getElementById('canvas');
		new Canvas(canvas);
	});

	return (
		<main className="main">
			<NavigationComponent />
			<canvas id="canvas"></canvas>
		</main>
	);
}

ReactDOM.render(<App/>, document.getElementById('root'));