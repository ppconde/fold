import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { SearchBarComponent } from '../search-bar/search-bar.component';
import { OrigamiPreviewComponent } from '../origami-preview/origami-preview.component';
import { cacheService } from '../../services/cache-service';
import { CACHE } from '../../constants/cache-constants';

export const SideMenuComponent = (props) => {
	const [searchText, setSearchText] = useState('');
	const [library, setLibrary] = useState([]);
	const [instructions, setInstructions] = useState([]);

	useEffect(() => getOrigamiFromCache(), []);

	const getOrigamiFromCache = () => {
		const library = cacheService.getItem(CACHE.ORIGAMI);
		const origamis = JSON.parse(library);
		setLibrary(origamis);
		setInstructions(origamis.map((o) => o.instructions));

	}

	const getInstructions = () => [...instructions?.map((m, i) => <p key={i}>{m[i + 1]}</p>)]

	const renderSettings = () => {
		return props.menuType === 'settings' ? (
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

	const renderLibrary = (setSearchText) => {
		return props.menuType === 'library' ? (
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

	const renderInstructions = () => {
		return props.menuType === 'instructions' ? (
			<aside className="side-menu">
				<div className="instructions">
					<h2 className="title">Instructions</h2>
					<button className="close" onClick={props.activateSideMenu} />
					<div className="content">
						{getInstructions()}
					</div>
				</div>
			</aside>
		) : null;
	}

	const renderShare = () => {
		return props.menuType === 'share' ? (
			<aside className="side-menu">
				<div className="share">
					Share your origamis
				</div>
			</aside>
		) : null;
	}

	const renderOrigamiPreviews = () => {
		const { loading } = props;
		const origamis = library.reduce((acc, v) => {
			if (v?.name.match(new RegExp(searchText, 'i'))) {
				acc.push(<OrigamiPreviewComponent key={v.id} name={v.name} />);
			}

			return acc;
		}, []);

		return origamis.length ?
			<div className="origami-previews">{origamis}</div> :
			<p className="no-origami">{loading ? 'Loading' : 'We couldn\'t find your origami 😞'}</p>;
	}

	const label = (name) => {
		const text = name === 'width' ? 'W' : 'H';
		return (
			<div className={`label-${text}`}>
				<label className="text" htmlFor={name}>{text}: </label>
				<input type="numeric" name={name}></input>
			</div>
		);
	}

	const renderBox = (name) => {
		return (
			<div className={name.toLowerCase()}>
				<span className="text">{name}</span>
			</div>
		);
	}

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

SideMenuComponent.propTypes = {
	activateSideMenu: PropTypes.func,
	menuType: PropTypes.string,
	loading: PropTypes.bool,
};