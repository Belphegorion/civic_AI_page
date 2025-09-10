import React from 'react';

export default function Input(props) {
  return (
    <input
      className="w-full p-2 border rounded focus:ring-2 focus:ring-sky-500 focus:outline-none"
      {...props}
    />
  );
}
