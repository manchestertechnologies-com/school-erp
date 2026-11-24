// Karnataka State Syllabus structure used for subject lists by band.
// Kannada is the first language. Subject names are display labels; confirm chapter
// names against the school's KTBS textbook list before live use.
export const KA_SUBJECTS = {
  JUNIOR: ['Kannada', 'English', 'Hindi', 'Maths', 'EVS', 'Art & Craft'],
  MIDDLE: ['Kannada', 'English', 'Hindi', 'Maths', 'Science', 'Social Science'],
  SENIOR: ['Kannada', 'English', 'Hindi', 'Maths', 'Science', 'Social Science'],
};
export const subjectTeacher = (sub) =>
  sub === 'Science' ? 'Mr. Arjun Mehta' : (sub === 'English' || sub === 'Maths') ? 'Ms. Priya Nair' : 'Mrs. Rao';
