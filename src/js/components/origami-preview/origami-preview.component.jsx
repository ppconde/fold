import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { cacheService } from '../../services/cache-service';

export const OrigamiPreviewComponent = (props) => {

	const [image, setImage] = useState('');

	useEffect(async () => {
		const image = cacheService.getItem(props.name.toLowerCase());
		setImage(JSON.parse(image));
	}, '')

	return (
		<div className="origami-preview">
			<img src={image} alt="Some Origami 🧻" className="image" />
			<span className="text">{props.name}</span>
		</div>
	);
}

OrigamiPreviewComponent.propTypes = {
	name: PropTypes.string,
};