declare module '*.svg?react' {
  const content: string & React.FunctionComponent<React.SVGAttributes<SVGElement>>;
  export default content;
}
