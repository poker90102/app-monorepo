import * as React from 'react';

import Svg, { Path, SvgProps } from 'react-native-svg';

function SvgSaveAs(props: SvgProps) {
  return (
    <Svg viewBox="0 0 20 20" fill="currentColor" {...props}>
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M3 5C3 3.89543 3.89543 3 5 3H8C8.55228 3 9 3.44772 9 4C9 4.55228 8.55228 5 8 5H5V8C5 8.55228 4.55228 9 4 9C3.44772 9 3 8.55228 3 8V5ZM11 4C11 3.44772 11.4477 3 12 3H15C16.1046 3 17 3.89543 17 5V8C17 8.55228 16.5523 9 16 9C15.4477 9 15 8.55228 15 8V5H12C11.4477 5 11 4.55228 11 4ZM4 11C4.55228 11 5 11.4477 5 12V15H8C8.55228 15 9 15.4477 9 16C9 16.5523 8.55228 17 8 17H5C3.89543 17 3 16.1046 3 15V12C3 11.4477 3.44772 11 4 11ZM16 11C16.5523 11 17 11.4477 17 12V15C17 16.1046 16.1046 17 15 17H12C11.4477 17 11 16.5523 11 16C11 15.4477 11.4477 15 12 15H15V12C15 11.4477 15.4477 11 16 11Z"
        fill="#8C8CA1"
      />
      <Path d="M7 7H13V13H7V7Z" fill="#8C8CA1" />
    </Svg>
  );
}

export default SvgSaveAs;
