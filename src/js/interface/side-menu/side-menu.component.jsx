import React from 'react';
import PropTypes from 'prop-types';

export const SideMenuComponent = (props) => {
	return (
		<aside className="side-menu">
			{renderSideMenu()}
		</aside>
	);

	function renderSideMenu() {
		switch (props.type) {
		case 'settings':
			return renderSettings();
		case 'library':
			// return this.renderLibrary();
			return;
		default:
			return;
		}
	}

	function renderSettings() {
		return props.showSideMenu ? (
			<div className="settings">
				<h2>Settings</h2>
				<div className="resizer">
					{label('width')}
					{label('height')}
					<div className="boxes">
						{renderBox('A4')}
						<div className="col">
							{renderBox('Custom')}
							{renderBox('Square')}
						</div>
					</div>
				</div>
			</div>
		) : null;
	}

	function label(name) {
		const text = name === 'width' ? 'W' : 'H';
		return (
			<div className={`label-${text}`}>
				<label className="text" htmlFor={name}>{text}: </label>
				<input type="number" name={name}></input>
			</div>
		);
	}

	function renderBox(name) {
		return (
			<div className={name.toLowerCase()}>
				<span className="text">{name}</span>
			</div>
		);
	}
}

SideMenuComponent.propTypes = {
	showSideMenu: PropTypes.boolean,
	type: PropTypes.string,
};