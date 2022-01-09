import React from 'react';

const links = ['Library', 'Instructions', 'Settings', 'Share'];

export const NavigationComponent = (props) => {
	return (
		<nav className="navigation">
			<ul className="list">
				{links.map((link) =>
					// eslint-disable-next-line react/prop-types
					<li className="link" key={link} onClick={props.onClickLink}>{link}</li>)}
			</ul>
		</nav>
	);
}