import "../assets/scss/main.scss";
import { main } from "../../conde/demos/custom-buffer-geometry/custom-buffer-geometry";
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

const App = () => {
    useEffect(() => {
      main();
    });

    return (
      <main className="main">
        <canvas className="main-canvas"></canvas>
      </main>
    );
}

ReactDOM.render(<App/>, document.getElementById('root'));