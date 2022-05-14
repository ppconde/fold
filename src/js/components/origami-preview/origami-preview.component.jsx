import React from 'react';
import PropTypes from 'prop-types';
import img from '../../../assets/img/dummy-origami.jpg';

export const OrigamiPreviewComponent = (props) => {

	const { image, name } = props;
	return (
		<div className="origami-preview">
			<img src={img} className="image" />
			<span className="text">{name}</span>
		</div>
	);
}

OrigamiPreviewComponent.propTypes = {
	image: PropTypes.string,
	name: PropTypes.string,
};