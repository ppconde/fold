import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { SearchBarComponent } from '../search-bar/search-bar.component';
import { OrigamiPreviewComponent } from '../origami-preview/origami-preview.component';
import { supabase } from '../../services/db-service';

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
	const [searchText, setSearchText] = useState('');

	useEffect(async () => {
		let { data } = await supabase
			.from('Origami')
			.select('id')
		console.log('data: ', data);
	})

	return renderSideMenu();

	function renderSideMenu() {
		switch (props.menuType) {
			case 'settings':
				return renderSettings();
			case 'library':
				return renderLibrary(setSearchText);
			case 'instructions':
				return renderInstructions();
			case 'share':
				return renderShare();
			default:
				return null;
		}
	}

	function renderSettings() {
		return props.showSideMenu && props.menuType === 'settings' ? (
			<aside className="side-menu">
				<div className="settings">
					<button className="close" onClick={props.activateSideMenu} />
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
			</aside>
		) : null;
	}

	function renderLibrary(setSearchText) {
		return props.showSideMenu && props.menuType === 'library' ? (
			<aside className="side-menu">
				<div className="library">
					<h2 className="title">Library</h2>
					<button className="close" onClick={props.activateSideMenu} />
					<SearchBarComponent setSearchText={setSearchText} />
					{renderOrigamiPreviews()}
				</div>
			</aside>
		) : null;
	}

	function renderInstructions() {
		return props.showSideMenu && props.menuType === 'instructions' ? (
			<aside className="side-menu">
				<div className="instructions">
					<h2 className="title">Instructions</h2>
					<button className="close" onClick={props.activateSideMenu} />
					<p className="content">
						Lorem ipsum dolor sit amet consectetur adipisicing elit. Consectetur aut placeat sed reiciendis
						quis cum quasi architecto, quibusdam, ea non excepturi maxime libero dolores aspernatur nihil?
						Porro, nulla expedita. Eos?
					</p>
				</div>
			</aside>
		) : null;
	}

	function renderShare() {
		return props.showSideMenu && props.menuType === 'share' ? (
			<aside className="side-menu">
				<div className="share">
					Share your origamis
				</div>
			</aside>
		) : null;
	}

	function renderOrigamiPreviews() {
		const origamis = data.library.reduce((acc, v) => {
			if (v.text.match(new RegExp(searchText, 'i'))) {
				acc.push(<OrigamiPreviewComponent key={v.key} image={v.img} text={v.text} />);
			}

			return acc;
		}, []);

		return origamis.length ? (
			<div className="origami-previews">
				{origamis}
			</div>
		) : <p className="no-origami">We couldn't find your origami 😞</p>;
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
	activateSideMenu: PropTypes.func,
	menuType: PropTypes.string,
};