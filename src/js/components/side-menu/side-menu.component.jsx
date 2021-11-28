import React from 'react';
import PropTypes from 'prop-types';
import { SearchBarComponent } from '../search-bar/search-bar.component';
import { OrigamiPreviewComponent } from '../origami-preview/origami-preview.component';

const data = {
	library: [
		{
			key: 1,
			text: 'Origami 1',
		},
		{
			key: 2,
			text: 'Origami 2',
		},
		{
			key: 3,
			text: 'Origami 3',
		},
		{
			key: 4,
			text: 'Origami 4',
		},
		{
			key: 5,
			text: 'Origami 5',
		},
		{
			key: 6,
			text: 'Origami 6',
		},
		{
			key: 7,
			text: 'Origami 7',
		},
		{
			key: 8,
			text: 'Origami 8',
		},
	]
}

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
			return renderLibrary();
		default:
			return;
		}
	}

	function renderSettings() {
		return props.showSideMenu && props.menuType === 'settings' ? (
			<div className="settings">
				<button className="close" onClick={props.toggleSideMenu} />
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

	function renderLibrary() {
		return props.showSideMenu && props.menuType === 'library' ? (
			<div className="library">
				<button className="close" onClick={props.toggleSideMenu} />
				<h2>Library</h2>
				<SearchBarComponent />
				{renderOrigamiPreviews()}
			</div>
		) : null;
	}

	function renderOrigamiPreviews() {
		return (
			<div className="origami-previews">
				{data.library.map((v) => <OrigamiPreviewComponent key={v.key} image={v.img} text={v.text}/>)}
			</div>
		);
	}

	function label(name) {
		const text = name === 'width' ? 'W' : 'H';
		return (
			<div className={`label-${text}`}>
				<label className="text" htmlFor={name}>{text}: </label>
				<input type="numeric" name={name}></input>
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
	toggleSideMenu: PropTypes.func,
	type: PropTypes.string,
	menuType: PropTypes.string,
};