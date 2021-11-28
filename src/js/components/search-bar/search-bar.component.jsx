import React from 'react';
import PropTypes from 'prop-types';

export const SearchBarComponent = (props) => {

	const { image, text } = props;
	return (
		
		<div className="search-bar">
			<input type="text" className="search" placeholder="Search your origami" />
			<button className="submit"></button>
			
		</div>
	);
}

SearchBarComponent.propTypes = {
	image: PropTypes.string,
	text: PropTypes.string,
};