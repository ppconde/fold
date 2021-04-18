import "../assets/scss/main.scss";
import React, {  useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Canvas } from '../js/Canvas';

const App = () => {
    useEffect(() => {
      const canvas = document.getElementById('canvas');
      new Canvas(canvas);
    });

    return (
      <main className="main">
        <canvas id="canvas"></canvas>
      </main>
    );
}

ReactDOM.render(<App/>, document.getElementById('root'));