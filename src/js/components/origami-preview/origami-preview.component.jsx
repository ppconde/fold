import React from 'react';
import PropTypes from 'prop-types';
import img from '../../../assets/img/dummy-origami.jpg';

export const OrigamiPreviewComponent = (props) => {

	const { image, text } = props;
	console.log(image)
	return (
		<div className="origami-preview">
			<img /* src={img} */ className="image" />
			<span className="text">{text}</span>
		</div>
	);
}

OrigamiPreviewComponent.propTypes = {
	image: PropTypes.string,
	text: PropTypes.string,
};