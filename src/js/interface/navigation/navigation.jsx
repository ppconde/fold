import './navigation.scss';
import React from 'react';

export const NavigationComponent = () => {


    return (
        <nav className="navigation">
            <div className="drop-item">
                <button className="drop-btn">File</button>
                <div className="drop-content">
                    <button className="drop-btn">Open file</button>
                </div>
            </div>

            <div className="drop-item">
                <button className="drop-btn">Pattern</button>
                <div className="drop-content">
                    <button className="drop-btn">Open file</button>
                </div>
            </div>
        </nav>
    );
}