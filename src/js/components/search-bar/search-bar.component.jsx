import React from 'react';
import PropTypes from 'prop-types';
import { ReactComponent as SearchIcon} from '../../../assets/img/search_black_24dp.svg';

export const SearchBarComponent = (props) => {

	const { image, text } = props;
	console.log(SearchIcon);
	return (
		<div className="search-bar">
			<div className="wrapper">
				<SearchIcon className="icon" />
				<input type="text" className="search" placeholder="Search your origami" />
			</div>
		</div>
	);
}

SearchBarComponent.propTypes = {
	image: PropTypes.string,
	text: PropTypes.string,
};