import * as React from 'react';

import Svg, { Path, SvgProps } from 'react-native-svg';

function Import(props: SvgProps) {
  return (
    <Svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
      <Path
        strokeWidth={1}
        d="M11.7071 7.29289C11.3166 6.90237 10.6834 6.90237 10.2929 7.29289C9.90237 7.68342 9.90237 8.31658 10.2929 8.70711L11.7071 7.29289ZM15 12L15.7071 12.7071L16.4142 12L15.7071 11.2929L15 12ZM10.2929 15.2929C9.90237 15.6834 9.90237 16.3166 10.2929 16.7071C10.6834 17.0976 11.3166 17.0976 11.7071 16.7071L10.2929 15.2929ZM3 11C2.44772 11 2 11.4477 2 12C2 12.5523 2.44772 13 3 13L3 11ZM4 8C4 8.55228 4.44772 9 5 9C5.55228 9 6 8.55228 6 8H4ZM6 16C6 15.4477 5.55228 15 5 15C4.44772 15 4 15.4477 4 16H6ZM10.2929 8.70711L14.2929 12.7071L15.7071 11.2929L11.7071 7.29289L10.2929 8.70711ZM14.2929 11.2929L10.2929 15.2929L11.7071 16.7071L15.7071 12.7071L14.2929 11.2929ZM15 11L3 11L3 13L15 13V11ZM7 4H18V2H7V4ZM19 5V19H21V5H19ZM18 20H7V22H18V20ZM6 8V5H4V8H6ZM6 19V16H4V19H6ZM7 20C6.44772 20 6 19.5523 6 19H4C4 20.6569 5.34315 22 7 22V20ZM19 19C19 19.5523 18.5523 20 18 20V22C19.6569 22 21 20.6569 21 19H19ZM18 4C18.5523 4 19 4.44772 19 5H21C21 3.34315 19.6569 2 18 2V4ZM7 2C5.34315 2 4 3.34315 4 5H6C6 4.44772 6.44772 4 7 4V2Z"
        fill="#8C8CA1"
      />
    </Svg>
  );
}

export default Import;
