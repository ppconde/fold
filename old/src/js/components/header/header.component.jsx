import React from 'react';
import PropTypes from 'prop-types';
import { NavigationComponent } from '../navigation/navigation.component';

export const HeaderComponent = (props) => {

	const { activateSideMenu } = props;
	return (
		<header className="header">
			<h1 className="title">Fold</h1>
			<NavigationComponent onClickLink={activateSideMenu}/>
		</header>
	);
}

HeaderComponent.propTypes = {
	activateSideMenu: PropTypes.func,
};