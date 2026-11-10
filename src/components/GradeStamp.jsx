import React from 'react';

// A pick grade (F to A+) as a stamp: green for A's, gold for B's, orange for C's, red for D's and F.
export default function GradeStamp({ grade, size = 'md' }) {
  const tone = { A: 'a', B: 'b', C: 'c', D: 'd', F: 'f' }[grade?.[0]] || 'c';
  return <span className={`grade-stamp grade-${tone} grade-${size}`} title={`Pick grade: ${grade}`}>{grade}</span>;
}
