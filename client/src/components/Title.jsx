import React from 'react';

function Title({ text1, text2 }) {
  return (
    <div className="inline-flex gap-2.5 items-center mb-3 select-none">
      <p className="text-amber-400 font-bold tracking-wider">
        {text1} <span className="text-gray-200 font-medium">{text2}</span>
      </p>
      <p className="w-8 sm:w-12 h-[2px] bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full"></p>
    </div>
  );
}

export default Title;