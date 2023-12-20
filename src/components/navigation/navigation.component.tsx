interface INavigationComponentProps {
  onClickLink: (e: React.MouseEvent) => void;
}

export const NavigationComponent = (props: INavigationComponentProps) => {
  return (
    <nav className="navigation">
      <ul className="list">
        {['Library', 'Instructions', 'Settings', 'Share'].map((link) => (
          <li className="link" key={link} onClick={props.onClickLink}>
            {link}
          </li>
        ))}
      </ul>
    </nav>
  );
};
