import React from 'react';

export const Squares = ({ children, squareSize, borderColor, hoverFillColor, direction, speed, ...props }) => {
  return (
    <div {...props}>
      {children}
    </div>
  );
};

export default Squares;