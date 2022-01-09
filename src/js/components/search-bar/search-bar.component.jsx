import React from 'react';
import PropTypes from 'prop-types';
import { ReactComponent as SearchIcon} from '../../../assets/img/search_black_24dp.svg';

export const SearchBarComponent = (props) => {
	return (
		<div className="search-bar">
			<div className="wrapper">
				<SearchIcon className="icon" />
				<input type="text" className="search" placeholder="Search your origami" onChange={onSearchChange} />
			</div>
		</div>
	);

	function onSearchChange(e) {
		const { setSearchText } = props;
		setSearchText(e.target.value.toLowerCase());
	}
}

SearchBarComponent.propTypes = {
	text: PropTypes.string,
	setSearchText: PropTypes.func,
};