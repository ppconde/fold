import React from 'react';

export const SideMenuComponent = (props, state) => {
	switch (props.type) {
	case 'settings':
		return renderSettings();
	case 'library':
		// return this.renderLibrary();
		return;
	default:
		return;
	}

	function renderSettings() {
		return state.showSideMenu ? (
			<aside className="settings">
				<h2>Settings</h2>
				<div className="resizer">
					{label('width')}
					{label('height')}
					<div className="a4">A4</div>
					<div className="custom">Custom</div>
					<div className="square">Square</div>
				</div>
			</aside>
		) : null;
	}

	function label(name) {
		const text = name === 'width' ? 'W' : 'H';
		return (
			<>
				<label htmlFor={name}>{text}: </label>
				<input type="number" name={name}></input>
			</>
		);
	}
}