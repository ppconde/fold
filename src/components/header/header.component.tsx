import { NavigationComponent } from '../navigation/navigation.component';

interface IHeaderComponentProps {
  activateSideMenu: (e: React.MouseEvent) => void;
}

export const HeaderComponent = (props: IHeaderComponentProps) => {
  const { activateSideMenu } = props;
  return (
    <header className="header">
      <h1 className="title">Fold</h1>
      <NavigationComponent onClickLink={activateSideMenu} />
    </header>
  );
};
