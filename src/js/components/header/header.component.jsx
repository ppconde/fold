import React from 'react';
import PropTypes from 'prop-types';
import { NavigationComponent } from '../navigation/navigation.component';

export const HeaderComponent = (props) => {

	const { toggleSideMenu } = props;
	return (
		<header className="header">
			<h1 className="title">Fold</h1>
			<NavigationComponent onClickLink={toggleSideMenu}/>
		</header>
	);
}

HeaderComponent.propTypes = {
	toggleSideMenu: PropTypes.function,
};